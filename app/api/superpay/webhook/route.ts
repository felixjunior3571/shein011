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

// Cache em memória para acesso rápido (evita consultas desnecessárias)
const paymentCache = new Map<string, any>()

// Função para salvar webhook no Supabase + Cache + Notificação
async function savePaymentWebhook(webhookData: any) {
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

    console.log(`🔄 Processando webhook SuperPay:`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      is_paid: statusInfo.isPaid,
    })

    // Dados padronizados para salvar
    const webhookRecord = {
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
      .upsert(webhookRecord, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Erro ao salvar webhook no Supabase:", error)
      throw error
    }

    console.log(`✅ Webhook SuperPay SALVO NO SUPABASE:`, savedRecord?.id)

    // 2. CRIAR NOTIFICAÇÃO PARA FRONTEND (Tempo Real)
    const notificationData = {
      external_id: externalId,
      notification_type: "payment_status_change",
      notification_data: {
        externalId,
        invoiceId,
        statusCode,
        statusName: statusInfo.name,
        isPaid: statusInfo.isPaid,
        isDenied: statusInfo.isDenied,
        isExpired: statusInfo.isExpired,
        isCanceled: statusInfo.isCanceled,
        isRefunded: statusInfo.isRefunded,
        amount,
        paymentDate: webhookRecord.payment_date,
        payId,
        receivedAt: webhookRecord.processed_at,
        source: "webhook_notification",
      },
    }

    const { error: notificationError } = await supabase.from("webhook_notifications").insert(notificationData)

    if (notificationError) {
      console.error("⚠️ Erro ao criar notificação (não crítico):", notificationError)
    } else {
      console.log(`📡 Notificação criada para frontend: ${externalId}`)
    }

    // 3. SALVAR NO CACHE (Acesso Rápido)
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
      paymentDate: webhookRecord.payment_date,
      payId,
      statusCode,
      statusName: statusInfo.name,
      receivedAt: webhookRecord.processed_at,
      rawData: webhookData,
      source: "webhook_cache",
    }

    // Salvar com múltiplas chaves para facilitar busca
    paymentCache.set(externalId, cacheData)
    paymentCache.set(invoiceId, cacheData)
    if (webhookData.token) {
      paymentCache.set(`token_${webhookData.token}`, cacheData)
    }

    console.log(`⚡ Webhook SuperPay SALVO NO CACHE: ${externalId}`)

    return savedRecord || webhookRecord
  } catch (error) {
    console.error("❌ Erro crítico ao processar webhook SuperPay:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔔 WEBHOOK SUPERPAY RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Get headers para validação
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers recebidos:", {
      "user-agent": headers["user-agent"],
      "content-type": headers["content-type"],
      "x-forwarded-for": headers["x-forwarded-for"],
    })

    // Parse webhook data
    const webhookData = await request.json()
    console.log("📦 Dados do webhook SuperPay:", JSON.stringify(webhookData, null, 2))

    // Validação básica dos dados
    if (!webhookData.external_id && !webhookData.id) {
      console.error("❌ Webhook inválido: external_id ou id não encontrado")
      return NextResponse.json(
        {
          success: false,
          error: "external_id ou id é obrigatório",
        },
        { status: 400 },
      )
    }

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

    // Verificar se é um status crítico que precisa ser processado
    const criticalStatuses = [5, 6, 9, 12, 15] // Pago, Cancelado, Estornado, Negado, Vencido
    const isCritical = criticalStatuses.includes(statusCode)

    console.log(`${isCritical ? "🚨" : "ℹ️"} Status ${statusCode} é ${isCritical ? "CRÍTICO" : "informativo"}`)

    // Processar webhook (sempre salvar, mas log diferente para críticos)
    const savedRecord = await savePaymentWebhook(webhookData)

    console.log("💾 Webhook SuperPay processado:", {
      id: savedRecord.id,
      external_id: savedRecord.external_id || externalId,
      status: savedRecord.status_name || statusName,
      is_paid: savedRecord.is_paid,
      is_critical: isCritical,
    })

    // Log específico para status críticos
    if (isCritical) {
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
        storage: "supabase_cache_notification",
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
    storage: "supabase_cache_notification",
    supported_methods: ["POST"],
    critical_statuses: [5, 6, 9, 12, 15],
    cache_size: paymentCache.size,
    rate_limit_info: "Webhook-based system - No polling to avoid rate limits",
    timestamp: new Date().toISOString(),
  })
}
