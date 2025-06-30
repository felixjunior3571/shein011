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

// Save payment confirmation to Supabase ONLY
async function savePaymentConfirmation(webhookData: any) {
  try {
    const externalId = webhookData.external_id || webhookData.id || `superpay_${Date.now()}`
    const invoiceId = webhookData.invoice_id || webhookData.id || externalId
    const statusCode = webhookData.status?.code || webhookData.status_code || 1
    const amount = webhookData.valores?.bruto ? webhookData.valores.bruto / 100 : 0

    const statusInfo = SUPERPAY_STATUS_MAP[statusCode as SuperPayStatus] || {
      name: "Desconhecido",
      isPaid: false,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
    }

    console.log(`🔄 Salvando webhook SuperPay no Supabase:`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      is_paid: statusInfo.isPaid,
    })

    // Check if record exists
    const { data: existingRecord } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("external_id", externalId)
      .eq("gateway", "superpay")
      .single()

    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      payment_date: webhookData.payment_date || (statusInfo.isPaid ? new Date().toISOString() : null),
      webhook_data: webhookData,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
    }

    let result
    if (existingRecord) {
      // Update existing record
      result = await supabase
        .from("payment_webhooks")
        .update(webhookRecord)
        .eq("id", existingRecord.id)
        .select()
        .single()

      console.log(`✅ Webhook SuperPay ATUALIZADO no Supabase:`, result.data?.id)
    } else {
      // Insert new record
      result = await supabase.from("payment_webhooks").insert(webhookRecord).select().single()

      console.log(`✅ Webhook SuperPay INSERIDO no Supabase:`, result.data?.id)
    }

    if (result.error) {
      console.error("❌ Erro ao salvar no Supabase:", result.error)
      throw result.error
    }

    return result.data
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

    // Validate SuperPay webhook (basic validation)
    const userAgent = headers["user-agent"] || ""
    const gateway = headers["x-gateway"] || headers["gateway"] || "superpay"

    console.log("🔍 Validação:", { userAgent, gateway })

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
      // Save to Supabase ONLY
      const savedRecord = await savePaymentConfirmation(webhookData)

      console.log("💾 Webhook SuperPay salvo no Supabase:", {
        id: savedRecord.id,
        external_id: savedRecord.external_id,
        status: savedRecord.status_name,
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
        storage: "supabase_only",
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
    storage: "supabase_only",
    supported_methods: ["POST"],
    critical_statuses: [5, 6, 9, 12, 15],
    timestamp: new Date().toISOString(),
  })
}
