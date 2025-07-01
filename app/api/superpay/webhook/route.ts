import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente Supabase com service key
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

    // Obter e validar body
    const body = await request.json()
    console.log("📦 [SuperPay Webhook] Body completo:", JSON.stringify(body, null, 2))

    // Validação básica
    if (!body || !body.invoices) {
      console.error("❌ [SuperPay Webhook] Estrutura inválida - campo 'invoices' ausente")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook structure",
          message: "Campo 'invoices' é obrigatório",
        },
        { status: 400 },
      )
    }

    // Extrair dados do invoice
    const invoice = body.invoices
    const event = body.event || {}

    // Dados principais
    const external_id = invoice.external_id
    const invoice_id = invoice.id?.toString()
    const status_code = invoice.status?.code
    const customer_id = invoice.customer?.toString()

    // Validações obrigatórias
    if (!external_id) {
      console.error("❌ [SuperPay Webhook] external_id ausente")
      return NextResponse.json(
        {
          success: false,
          error: "Missing external_id",
        },
        { status: 400 },
      )
    }

    if (!status_code) {
      console.error("❌ [SuperPay Webhook] status_code ausente")
      return NextResponse.json(
        {
          success: false,
          error: "Missing status_code",
        },
        { status: 400 },
      )
    }

    console.log("🎯 [SuperPay Webhook] Dados extraídos:")
    console.log("- External ID:", external_id)
    console.log("- Invoice ID:", invoice_id)
    console.log("- Status Code:", status_code)
    console.log("- Customer ID:", customer_id)

    // Mapear status
    const statusInfo = STATUS_MAPPING[status_code as keyof typeof STATUS_MAPPING] || {
      name: "unknown",
      title: `Status ${status_code}`,
      is_paid: false,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      is_refunded: false,
    }

    console.log("📊 [SuperPay Webhook] Status mapeado:", statusInfo)

    // Extrair valores financeiros
    const amount = Number.parseFloat(invoice.prices?.total?.toString() || "0")
    const discount = Number.parseFloat(invoice.prices?.discount?.toString() || "0")
    const taxes = Number.parseFloat(invoice.prices?.taxs?.others?.toString() || "0")

    console.log("💰 [SuperPay Webhook] Valores:", { amount, discount, taxes })

    // Preparar dados para inserção
    const webhookData = {
      external_id,
      invoice_id: invoice_id || external_id,
      token: invoice.token || null,
      gateway: "superpay",

      // Status
      status_code,
      status_name: statusInfo.name,
      status_title: statusInfo.title,
      status_description: invoice.status?.description || null,
      status_text: invoice.status?.text || statusInfo.name,

      // Valores
      amount,
      discount,
      taxes,

      // Pagamento
      payment_type: invoice.type || "PIX",
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
      customer_id: customer_id || "UNKNOWN",

      // Evento
      event_type: event.type || "webhook.update",
      event_date: event.date ? new Date(event.date).toISOString() : new Date().toISOString(),

      // Dados completos
      webhook_data: body,

      // Timestamps
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("💾 [SuperPay Webhook] Dados preparados para salvar:")
    console.log("- External ID:", webhookData.external_id)
    console.log("- Status Code:", webhookData.status_code)
    console.log("- Status Title:", webhookData.status_title)
    console.log("- Amount:", webhookData.amount)
    console.log("- Is Paid:", webhookData.is_paid)
    console.log("- Customer ID:", webhookData.customer_id)

    // Salvar no Supabase com UPSERT
    console.log("💾 [SuperPay Webhook] Salvando no Supabase...")

    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
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
            external_id,
            status_code,
            amount,
            customer_id: webhookData.customer_id,
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
      console.log("🆔 External ID:", external_id)
      console.log("👤 Customer ID:", customer_id)
      console.log("📅 Data:", webhookData.payment_date)
      console.log("🏦 Gateway:", webhookData.payment_gateway)
      console.log("📡 Realtime será ativado automaticamente!")
      console.log("🚀 Frontend deve redirecionar para /upp/001")
    } else if (statusInfo.is_denied) {
      console.log("❌ [SuperPay Webhook] PAGAMENTO NEGADO:", external_id)
    } else if (statusInfo.is_expired) {
      console.log("⏰ [SuperPay Webhook] PAGAMENTO VENCIDO:", external_id)
    } else if (statusInfo.is_canceled) {
      console.log("🚫 [SuperPay Webhook] PAGAMENTO CANCELADO:", external_id)
    } else {
      console.log("📊 [SuperPay Webhook] Status atualizado:", external_id, "->", status_code, `(${statusInfo.title})`)
    }

    const processingTime = Date.now() - startTime
    console.log("⚡ [SuperPay Webhook] Tempo de processamento:", processingTime, "ms")

    // Resposta de sucesso
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id,
        status_code,
        status_name: statusInfo.name,
        status_title: statusInfo.title,
        amount,
        customer_id: webhookData.customer_id,
        is_paid: statusInfo.is_paid,
        is_final: statusInfo.is_paid || statusInfo.is_denied || statusInfo.is_expired || statusInfo.is_canceled,
        processed_at: webhookData.processed_at,
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
