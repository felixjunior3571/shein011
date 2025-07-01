import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente Supabase com service key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeamento COMPLETO de status codes SuperPay
const STATUS_MAPPING = {
  1: {
    name: "pending",
    title: "Aguardando Pagamento",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  2: {
    name: "processing",
    title: "Processando",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  3: {
    name: "analyzing",
    title: "Analisando",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  4: {
    name: "approved",
    title: "Aprovado",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  5: {
    name: "paid",
    title: "Pagamento Confirmado!",
    is_paid: true,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  6: {
    name: "denied",
    title: "Pagamento Negado",
    is_paid: false,
    is_denied: true,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  7: {
    name: "refunded",
    title: "Estornado",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: true,
  },
  8: {
    name: "partial_refund",
    title: "Estorno Parcial",
    is_paid: true,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: true,
  },
  9: {
    name: "expired",
    title: "Vencido",
    is_paid: false,
    is_denied: false,
    is_expired: true,
    is_canceled: false,
    is_refunded: false,
  },
  10: {
    name: "canceled",
    title: "Cancelado",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: true,
    is_refunded: false,
  },
  12: {
    name: "chargeback",
    title: "Chargeback",
    is_paid: false,
    is_denied: true,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  15: {
    name: "dispute",
    title: "Disputa",
    is_paid: false,
    is_denied: false,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
  16: {
    name: "fraud",
    title: "Fraude",
    is_paid: false,
    is_denied: true,
    is_expired: false,
    is_canceled: false,
    is_refunded: false,
  },
} as const

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log("🔔 [SuperPay Webhook] ===== WEBHOOK RECEBIDO =====")
    console.log("⏰ [SuperPay Webhook] Timestamp:", new Date().toISOString())

    // Obter headers para debug
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 [SuperPay Webhook] Headers importantes:", {
      "content-type": headers["content-type"],
      "user-agent": headers["user-agent"],
      userid: headers["userid"],
      gateway: headers["gateway"],
      webhook: headers["webhook"],
    })

    // Parse the webhook data
    const webhookData = await request.json()
    console.log("📦 [SuperPay Webhook] Body completo:", JSON.stringify(webhookData, null, 2))

    // Extract invoice data
    const invoice = webhookData?.invoices
    if (!invoice) {
      console.error("❌ [SuperPay Webhook] Dados de fatura não encontrados no webhook")
      return NextResponse.json(
        {
          success: false,
          error: "Invoice data not found",
        },
        { status: 400 },
      )
    }

    const externalId = invoice.external_id
    const statusCode = invoice.status?.code
    const statusTitle = invoice.status?.title
    const statusDescription = invoice.status?.description
    const amount = invoice.prices?.total
    const customerId = invoice.customer
    const paymentType = invoice.type

    console.log(`📋 [SuperPay Webhook] Processando: ${externalId} - Status: ${statusCode} - Valor: ${amount}`)

    // Mapear status
    const statusInfo = STATUS_MAPPING[statusCode as keyof typeof STATUS_MAPPING] || {
      name: "unknown",
      title: `Status ${statusCode}`,
      is_paid: false,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      is_refunded: false,
    }

    console.log("📊 [SuperPay Webhook] Status mapeado:", statusInfo)

    // Extrair valores financeiros
    const discount = Number.parseFloat(invoice.prices?.discount?.toString() || "0")
    const taxes = Number.parseFloat(invoice.prices?.taxs?.others?.toString() || "0")

    console.log("💰 [SuperPay Webhook] Valores:", { amount, discount, taxes })

    // Preparar dados para inserção
    const preparedData = {
      external_id: externalId,
      invoice_id: invoice.id?.toString() || externalId,
      token: invoice.token || null,
      gateway: "superpay",

      // Status
      status_code: statusCode,
      status_name: statusInfo.name,
      status_title: statusTitle || statusInfo.title,
      status_description: statusDescription || null,
      status_text: invoice.status?.text || statusInfo.name,

      // Valores
      amount: amount,
      discount: discount,
      taxes: taxes,

      // Pagamento
      payment_type: paymentType || "PIX",
      payment_gateway: invoice.payment?.gateway || "SuperPay",
      payment_date:
        invoice.payment?.payDate || invoice.payment?.date
          ? new Date(invoice.payment.payDate || invoice.payment.date).toISOString()
          : null,
      payment_due: invoice.payment?.due ? new Date(invoice.payment.due).toISOString() : null,

      // Códigos
      qr_code: invoice.payment?.details?.qrcode || null,
      pix_code: invoice.payment?.details?.pix_code || null,
      barcode: invoice.payment?.details?.barcode || null,
      payment_url: invoice.payment?.details?.url || null,

      // Flags de status
      is_paid: statusInfo.is_paid,
      is_denied: statusInfo.is_denied,
      is_expired: statusInfo.is_expired,
      is_canceled: statusInfo.is_canceled,
      is_refunded: statusInfo.is_refunded,

      // Cliente (OBRIGATÓRIO - corrigido)
      customer_id: customerId || "UNKNOWN",

      // Evento
      event_type: webhookData.event?.type || "webhook.update",
      event_date: webhookData.event?.date ? new Date(webhookData.event.date).toISOString() : new Date().toISOString(),

      // Dados completos
      webhook_data: webhookData,

      // Timestamps
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("💾 [SuperPay Webhook] Dados preparados para salvar:")
    console.log("- External ID:", preparedData.external_id)
    console.log("- Status Code:", preparedData.status_code)
    console.log("- Status Title:", preparedData.status_title)
    console.log("- Amount:", preparedData.amount)
    console.log("- Is Paid:", preparedData.is_paid)
    console.log("- Customer ID:", preparedData.customer_id)

    // Salvar no Supabase com UPSERT
    console.log("💾 [SuperPay Webhook] Salvando no Supabase...")

    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(preparedData, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ [SuperPay Webhook] ERRO NO SUPABASE:", error)
      console.error("❌ [SuperPay Webhook] Detalhes:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })

      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          message: error.message,
          details: error,
          debug_info: {
            external_id: externalId,
            status_code: statusCode,
            amount: amount,
            customer_id: preparedData.customer_id,
            processing_time: Date.now() - startTime,
          },
        },
        { status: 500 },
      )
    }

    console.log("✅ [SuperPay Webhook] SALVO NO SUPABASE COM SUCESSO!")
    console.log("📄 [SuperPay Webhook] Dados salvos:", data)

    // Log específico baseado no status
    if (statusInfo.is_paid) {
      console.log("🎉 [SuperPay Webhook] ===== PAGAMENTO CONFIRMADO! =====")
      console.log("💰 Valor: R$", amount.toFixed(2))
      console.log("🆔 External ID:", externalId)
      console.log("👤 Customer ID:", customerId)
      console.log("📅 Data:", preparedData.payment_date)
      console.log("🏦 Gateway:", preparedData.payment_gateway)
      console.log("📡 Realtime será ativado automaticamente!")
      console.log("🚀 Frontend deve redirecionar para /upp/001")
    } else if (statusInfo.is_denied) {
      console.log("❌ [SuperPay Webhook] PAGAMENTO NEGADO:", externalId)
    } else if (statusInfo.is_expired) {
      console.log("⏰ [SuperPay Webhook] PAGAMENTO VENCIDO:", externalId)
    } else if (statusInfo.is_canceled) {
      console.log("🚫 [SuperPay Webhook] PAGAMENTO CANCELADO:", externalId)
    } else {
      console.log("📊 [SuperPay Webhook] Status atualizado:", externalId, "->", statusCode, `(${statusInfo.title})`)
    }

    const processingTime = Date.now() - startTime
    console.log("⚡ [SuperPay Webhook] Tempo de processamento:", processingTime, "ms")

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id: externalId,
        status_code: statusCode,
        status_name: statusInfo.name,
        status_title: statusTitle || statusInfo.title,
        amount: amount,
        customer_id: preparedData.customer_id,
        is_paid: statusInfo.is_paid,
        is_final: statusInfo.is_paid || statusInfo.is_denied || statusInfo.is_expired || statusInfo.is_canceled,
        processed_at: preparedData.processed_at,
        processing_time: processingTime,
      },
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error("💥 [SuperPay Webhook] ERRO CRÍTICO:", error)
    console.error("💥 [SuperPay Webhook] Stack trace:", error instanceof Error ? error.stack : "N/A")
    console.error("💥 [SuperPay Webhook] Tempo até erro:", processingTime, "ms")

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        processing_time: processingTime,
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
    version: "5.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: "/api/superpay/webhook",
      status: "/api/superpay/payment-status",
    },
    supported_events: ["webhook.update", "invoice.update"],
    critical_statuses: [5, 6, 9, 10, 12, 16],
    schema_cache: "refreshed",
  })
}
