import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente Supabase com service key para operações de servidor
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento completo de status codes da SuperPayBR
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
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 [SuperPay Webhook] ===== WEBHOOK RECEBIDO =====")

    // Obter headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 [SuperPay Webhook] Headers:", headers)

    // Obter body
    const body = await request.json()
    console.log("📦 [SuperPay Webhook] Body completo:", JSON.stringify(body, null, 2))

    // Validar estrutura básica do webhook
    if (!body.invoices) {
      console.error("❌ [SuperPay Webhook] Campo 'invoices' não encontrado")
      return NextResponse.json(
        {
          success: false,
          error: "Invalid webhook structure",
          message: "Campo 'invoices' é obrigatório",
        },
        { status: 400 },
      )
    }

    // Extrair dados do webhook SuperPay
    const invoice = body.invoices
    const event = body.event || {}

    // Dados principais
    const external_id = invoice.external_id
    const invoice_id = invoice.id?.toString()
    const token = invoice.token
    const status_code = invoice.status?.code
    const customer_id = invoice.customer

    // Valores financeiros
    const amount = Number.parseFloat(invoice.prices?.total?.toString() || "0")
    const discount = Number.parseFloat(invoice.prices?.discount?.toString() || "0")
    const taxes = Number.parseFloat(invoice.prices?.taxs?.others?.toString() || "0")

    // Dados de pagamento
    const payment_type = invoice.type || "PIX"
    const payment_gateway = invoice.payment?.gateway || "SuperPay"
    const payment_date = invoice.payment?.payDate || invoice.payment?.date
    const payment_due = invoice.payment?.due

    // Códigos de pagamento
    const qr_code = invoice.payment?.details?.qrcode || null
    const pix_code = invoice.payment?.details?.pix_code || null
    const barcode = invoice.payment?.details?.barcode || null
    const payment_url = invoice.payment?.details?.url || null

    // Dados do evento
    const event_type = event.type || "webhook.update"
    const event_date = event.date

    console.log("🔍 [SuperPay Webhook] Dados extraídos:")
    console.log("- External ID:", external_id)
    console.log("- Invoice ID:", invoice_id)
    console.log("- Status Code:", status_code)
    console.log("- Amount:", amount)
    console.log("- Payment Type:", payment_type)
    console.log("- Event Type:", event_type)
    console.log("- Customer ID:", customer_id)

    // Validações obrigatórias
    if (!external_id) {
      console.error("❌ [SuperPay Webhook] external_id não encontrado")
      return NextResponse.json(
        {
          success: false,
          error: "Missing external_id",
          message: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    if (!status_code) {
      console.error("❌ [SuperPay Webhook] status_code não encontrado")
      return NextResponse.json(
        {
          success: false,
          error: "Missing status_code",
          message: "status.code é obrigatório",
        },
        { status: 400 },
      )
    }

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

    // Preparar dados completos para inserção
    const webhookData = {
      external_id,
      invoice_id,
      token,
      gateway: "superpaybr",

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
      payment_type,
      payment_gateway,
      payment_date: payment_date ? new Date(payment_date).toISOString() : null,
      payment_due: payment_due ? new Date(payment_due).toISOString() : null,

      // Códigos
      qr_code,
      pix_code,
      barcode,
      payment_url,

      // Flags de status
      is_paid: statusInfo.is_paid,
      is_denied: statusInfo.is_denied,
      is_expired: statusInfo.is_expired,
      is_canceled: statusInfo.is_canceled,
      is_refunded: statusInfo.is_refunded,

      // Cliente
      customer_id,

      // Evento
      event_type,
      event_date: event_date ? new Date(event_date).toISOString() : null,

      // Metadata
      webhook_data: body,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("💾 [SuperPay Webhook] Dados preparados para salvar:")
    console.log("- External ID:", webhookData.external_id)
    console.log("- Status Code:", webhookData.status_code)
    console.log("- Status Title:", webhookData.status_title)
    console.log("- Amount:", webhookData.amount)
    console.log("- Is Paid:", webhookData.is_paid)
    console.log("- QR Code:", webhookData.qr_code ? "✅ Presente" : "❌ Ausente")

    // Verificar variáveis de ambiente
    console.log("🔑 [SuperPay Webhook] Verificando env vars:")
    console.log("- SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Definida" : "❌ Não definida")
    console.log("- SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Definida" : "❌ Não definida")

    // Salvar no Supabase
    console.log("💾 [SuperPay Webhook] Salvando no Supabase...")

    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ [SuperPay Webhook] Erro no Supabase:", error)
      console.error("❌ [SuperPay Webhook] Detalhes completos:", {
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
            has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            webhook_data_size: JSON.stringify(body).length,
          },
        },
        { status: 500 },
      )
    }

    console.log("✅ [SuperPay Webhook] Salvo no Supabase com sucesso!")
    console.log("📄 [SuperPay Webhook] Dados salvos:", data)

    // Log final baseado no status
    if (statusInfo.is_paid) {
      console.log(`🎉 [SuperPay Webhook] ===== PAGAMENTO CONFIRMADO! =====`)
      console.log(`💰 External ID: ${external_id}`)
      console.log(`💵 Valor: R$ ${amount}`)
      console.log(`📅 Data: ${payment_date}`)
      console.log(`🏦 Gateway: ${payment_gateway}`)
      console.log(`📡 Realtime será ativado automaticamente`)
    } else if (statusInfo.is_denied) {
      console.log(`❌ [SuperPay Webhook] PAGAMENTO NEGADO: ${external_id}`)
    } else if (statusInfo.is_expired) {
      console.log(`⏰ [SuperPay Webhook] PAGAMENTO VENCIDO: ${external_id}`)
    } else if (statusInfo.is_canceled) {
      console.log(`🚫 [SuperPay Webhook] PAGAMENTO CANCELADO: ${external_id}`)
    } else {
      console.log(`📊 [SuperPay Webhook] Status atualizado: ${external_id} -> ${status_code} (${statusInfo.title})`)
    }

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
        is_final: statusInfo.is_paid || statusInfo.is_denied || statusInfo.is_expired || statusInfo.is_canceled,
        is_paid: statusInfo.is_paid,
        processed_at: webhookData.processed_at,
        storage: "supabase_complete",
      },
    })
  } catch (error) {
    console.error("❌ [SuperPay Webhook] ERRO CRÍTICO:", error)
    console.error("❌ [SuperPay Webhook] Stack trace:", error instanceof Error ? error.stack : "N/A")

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPay Webhook endpoint ativo e funcionando",
    timestamp: new Date().toISOString(),
    env_check: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    version: "2.0.0",
  })
}
