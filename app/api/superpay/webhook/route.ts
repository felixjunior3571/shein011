import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// SuperPay status mapping
const SUPERPAY_STATUS_MAP = {
  5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  12: { name: "Negado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  15: { name: "Vencido", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
  6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
  9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
} as const

type SuperPayStatus = keyof typeof SUPERPAY_STATUS_MAP

// Cache em memória para acesso rápido
const paymentCache = new Map<string, any>()

// Função híbrida: salva em Supabase + Cache
async function savePaymentConfirmation(webhookData: any) {
  try {
    const externalId = webhookData.external_id || webhookData.id || `superpay_${Date.now()}`
    const invoiceId = webhookData.invoice_id || webhookData.id || externalId
    const statusCode = webhookData.status?.code || webhookData.status_code || 1
    const amount = webhookData.valores?.bruto ? webhookData.valores.bruto / 100 : 0
    const payId = webhookData.pay_id || webhookData.payId || null

    const statusInfo = SUPERPAY_STATUS_MAP[statusCode as SuperPayStatus] || {
      name: "Desconhecido",
      isPaid: false,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
    }

    console.log(`🔄 Salvando webhook SuperPay (HÍBRIDO):`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      is_paid: statusInfo.isPaid,
    })

    // Dados padronizados
    const paymentData = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      payment_date: webhookData.payment_date || (statusInfo.isPaid ? new Date().toISOString() : null),
      pay_id: payId,
      webhook_data: webhookData,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
    }

    // 1. SALVAR NO SUPABASE (Persistente)
    const { data: savedRecord, error } = await supabase
      .from("payment_webhooks")
      .upsert(paymentData, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Erro ao salvar no Supabase:", error)
      throw error
    }

    console.log(`✅ Webhook SuperPay SALVO NO SUPABASE:`, savedRecord?.id)

    // 2. SALVAR NO CACHE (Rápido)
    const cacheData = {
      externalId,
      invoiceId,
      token: webhookData.token || null,
      isPaid: statusInfo.isPaid,
      isRefunded: statusInfo.isRefunded,
      isDenied: statusInfo.isDenied,
      isExpired: statusInfo.isExpired,
      isCanceled: statusInfo.isCanceled,
      amount,
      paymentDate: paymentData.payment_date,
      payId,
      statusCode,
      statusName: statusInfo.name,
      statusDescription: webhookData.status?.description || "",
      receivedAt: paymentData.processed_at,
      rawData: webhookData,
      source: "webhook_hybrid",
    }

    // Salvar com múltiplas chaves para facilitar busca
    paymentCache.set(externalId, cacheData)
    paymentCache.set(invoiceId, cacheData)
    if (webhookData.token) {
      paymentCache.set(`token_${webhookData.token}`, cacheData)
    }

    console.log(`✅ Webhook SuperPay SALVO NO CACHE: ${externalId}`)

    return savedRecord || paymentData
  } catch (error) {
    console.error("❌ Erro crítico ao salvar webhook SuperPay:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔔 WEBHOOK SUPERPAY RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Get headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers recebidos:", headers)

    // Parse webhook data
    const webhookData = await request.json()
    console.log("📦 Dados do webhook SuperPay:", JSON.stringify(webhookData, null, 2))

    // Extract key information
    const externalId = webhookData.external_id || webhookData.id
    const statusCode = webhookData.status?.code || webhookData.status_code
    const statusName = webhookData.status?.title || webhookData.status_name || "Desconhecido"
    const amount = webhookData.valores?.bruto ? webhookData.valores.bruto / 100 : 0

    console.log("🎯 Informações extraídas:", {
      external_id: externalId,
      status_code: statusCode,
      status_name: statusName,
      amount: amount,
    })

    // Check if it's a critical status that needs processing
    const criticalStatuses = [5, 6, 9, 12, 15] // Pago, Cancelado, Estornado, Negado, Vencido
    const isCritical = criticalStatuses.includes(statusCode)

    console.log(`${isCritical ? "🚨" : "ℹ️"} Status ${statusCode} é ${isCritical ? "CRÍTICO" : "informativo"}`)

    if (isCritical) {
      // Salvar no sistema híbrido (Supabase + Cache)
      const savedRecord = await savePaymentConfirmation(webhookData)

      console.log("💾 Webhook SuperPay salvo no sistema híbrido:", {
        id: savedRecord.id,
        external_id: savedRecord.external_id || externalId,
        status: savedRecord.status_name || statusName,
        is_paid: savedRecord.is_paid,
      })

      // Log critical status
      if (statusCode === 5) {
        console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
        console.log(`💰 Valor: R$ ${amount.toFixed(2)}`)
        console.log(`🆔 External ID: ${externalId}`)
      } else if (statusCode === 12) {
        console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
      } else if (statusCode === 15) {
        console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
      } else if (statusCode === 6) {
        console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
      } else if (statusCode === 9) {
        console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
      }
    }

    // Return success response
    const response = {
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id: externalId,
        status_code: statusCode,
        status_name: statusName,
        amount: amount,
        is_critical: isCritical,
        processed_at: new Date().toISOString(),
        storage: "hybrid_supabase_cache",
      },
    }

    console.log("✅ Resposta do webhook SuperPay:", response)
    console.log("🏁 Processamento concluído!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NO WEBHOOK SUPERPAY:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "SuperPay Webhook Endpoint",
    status: "active",
    storage: "hybrid_supabase_cache",
    supported_methods: ["POST"],
    critical_statuses: [5, 6, 9, 12, 15],
    cache_size: paymentCache.size,
    timestamp: new Date().toISOString(),
  })
}
