import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente Supabase com service key para operações de servidor
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status codes da SuperPayBR
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
    console.log("🔔 [SuperPay Webhook] Webhook recebido")

    // Obter headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 [SuperPay Webhook] Headers:", headers)

    // Obter body
    const body = await request.json()
    console.log("📦 [SuperPay Webhook] Body completo:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook
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

    const invoice = body.invoices
    const external_id = invoice.external_id
    const status_code = invoice.status?.code

    // CORREÇÃO: Usar prices.total em vez de amount
    const amount = invoice.prices?.total || 0

    console.log("🔍 [SuperPay Webhook] Dados extraídos:")
    console.log("- External ID:", external_id)
    console.log("- Status Code:", status_code)
    console.log("- Amount (prices.total):", amount)
    console.log("- Event Type:", body.event?.type)

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

    console.log(`🔍 [SuperPay Webhook] Processando - External ID: ${external_id}, Status: ${status_code}`)

    // Obter informações do status
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

    // Preparar dados para salvar
    const webhookData = {
      external_id,
      invoice_id: invoice.id?.toString() || external_id,
      token: invoice.token || null,
      gateway: "superpaybr",
      status_code,
      status_name: statusInfo.name,
      status_title: statusInfo.title,
      status_description: invoice.status?.description || null,
      status_text: invoice.status?.text || statusInfo.name,
      amount: Number.parseFloat(amount.toString()) || 0,
      payment_date: invoice.payment?.payDate || invoice.payment?.date || null,
      payment_due: invoice.payment?.due || null,
      payment_gateway: invoice.payment?.gateway || "SuperPay",
      qr_code: invoice.payment?.details?.qrcode || null,
      pix_code: invoice.payment?.details?.pix_code || null,
      barcode: invoice.payment?.details?.barcode || null,
      is_paid: statusInfo.is_paid,
      is_denied: statusInfo.is_denied,
      is_expired: statusInfo.is_expired,
      is_canceled: statusInfo.is_canceled,
      is_refunded: statusInfo.is_refunded,
      webhook_data: body,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("💾 [SuperPay Webhook] Dados preparados para salvar:", {
      external_id: webhookData.external_id,
      status_code: webhookData.status_code,
      status_title: webhookData.status_title,
      amount: webhookData.amount,
      is_paid: webhookData.is_paid,
      gateway: webhookData.gateway,
    })

    // Verificar se as variáveis de ambiente estão corretas
    console.log("🔑 [SuperPay Webhook] Verificando env vars:")
    console.log("- SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Definida" : "❌ Não definida")
    console.log("- SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Definida" : "❌ Não definida")

    // Salvar no Supabase usando upsert (evita duplicatas)
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ [SuperPay Webhook] Erro no Supabase:", error)
      console.error("❌ [SuperPay Webhook] Detalhes do erro:", {
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
          },
        },
        { status: 500 },
      )
    }

    console.log("✅ [SuperPay Webhook] Salvo no Supabase com sucesso:", data)

    // Log do status final
    if (statusInfo.is_paid) {
      console.log(`🎉 [SuperPay Webhook] PAGAMENTO CONFIRMADO! External ID: ${external_id}, Valor: R$ ${amount}`)

      // Trigger adicional para garantir que o Realtime funcione
      console.log(`📡 [SuperPay Webhook] Enviando notificação Realtime para: ${external_id}`)
    } else if (statusInfo.is_denied) {
      console.log(`❌ [SuperPay Webhook] PAGAMENTO NEGADO! External ID: ${external_id}`)
    } else if (statusInfo.is_expired) {
      console.log(`⏰ [SuperPay Webhook] PAGAMENTO VENCIDO! External ID: ${external_id}`)
    } else if (statusInfo.is_canceled) {
      console.log(`🚫 [SuperPay Webhook] PAGAMENTO CANCELADO! External ID: ${external_id}`)
    } else {
      console.log(`📊 [SuperPay Webhook] Status atualizado: ${external_id} -> ${status_code} (${statusInfo.title})`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id,
        status_code,
        status_name: statusInfo.name,
        status_title: statusInfo.title,
        amount: webhookData.amount,
        is_final: statusInfo.is_paid || statusInfo.is_denied || statusInfo.is_expired || statusInfo.is_canceled,
        is_paid: statusInfo.is_paid,
        processed_at: webhookData.processed_at,
        storage: "supabase_only",
      },
    })
  } catch (error) {
    console.error("❌ [SuperPay Webhook] Erro geral:", error)
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
    message: "SuperPay Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
    env_check: {
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
}
