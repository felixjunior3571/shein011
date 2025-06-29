import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória
export const globalPaymentStorage = new Map<string, any>()

// Mapeamento de status SuperPayBR baseado nos dados reais
const STATUS_MAPPING = {
  1: {
    name: "pending",
    title: "Aguardando Pagamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  2: {
    name: "processing",
    title: "Em Processamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  3: {
    name: "approved",
    title: "Aprovado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  4: {
    name: "paid",
    title: "Pago",
    isPaid: true,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  5: {
    name: "paid",
    title: "Pagamento Confirmado!",
    isPaid: true,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  6: {
    name: "canceled",
    title: "Pagamento Cancelado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: true,
    isRefunded: false,
  },
  7: {
    name: "denied",
    title: "Pagamento Negado",
    isPaid: false,
    isDenied: true,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  8: {
    name: "refunded",
    title: "Pagamento Estornado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: true,
  },
  9: {
    name: "expired",
    title: "Pagamento Vencido",
    isPaid: false,
    isDenied: false,
    isExpired: true,
    isCanceled: false,
    isRefunded: false,
  },
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPayBR recebido")

    // Log dos headers para debug
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers do webhook:", headers)

    const body = await request.json()
    console.log("📥 Dados completos do webhook SuperPayBR:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR baseado na estrutura real
    const eventType = body.event?.type || "webhook.update"
    const invoiceData = body.invoices || body.invoice || body.data

    if (!invoiceData) {
      console.log("⚠️ Dados da fatura não encontrados no webhook")
      return NextResponse.json({
        success: true,
        message: "Webhook processado (sem dados de fatura)",
        received_data: body,
      })
    }

    // Extrair external_id
    const externalId = invoiceData.external_id || invoiceData.id

    if (!externalId) {
      console.log("⚠️ External ID não encontrado no webhook")
      return NextResponse.json({
        success: true,
        message: "Webhook processado (sem external_id)",
        invoice_data: invoiceData,
      })
    }

    console.log("🆔 External ID encontrado:", externalId)

    // Extrair status
    const statusCode = invoiceData.status?.code || 1
    const statusInfo = STATUS_MAPPING[statusCode as keyof typeof STATUS_MAPPING] || STATUS_MAPPING[1]

    // Extrair valor do campo prices.total
    const amount = invoiceData.prices?.total || invoiceData.amount || 0

    // Extrair dados do pagamento
    const paymentDate = invoiceData.payment?.payDate || invoiceData.payment?.date || null

    // Dados completos do pagamento
    const paymentData = {
      external_id: externalId,
      invoice_id: invoiceData.id || externalId,
      status: {
        code: statusCode,
        text: statusInfo.name,
        title: statusInfo.title,
      },
      amount: Number.parseFloat(amount.toString()),
      payment_date: statusInfo.isPaid && paymentDate ? paymentDate : null,
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      webhook_received_at: new Date().toISOString(),
      raw_data: invoiceData,
      event_type: eventType,
    }

    console.log("💾 Salvando no armazenamento global:", {
      external_id: externalId,
      status: statusInfo.name,
      amount: paymentData.amount,
      is_paid: statusInfo.isPaid,
    })

    // Salvar no armazenamento global
    globalPaymentStorage.set(externalId, paymentData)

    // Backup no Supabase (assíncrono)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      await supabase.from("payment_webhooks").upsert(
        {
          external_id: externalId,
          payment_data: paymentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )

      console.log("✅ Backup no Supabase realizado")
    } catch (supabaseError) {
      console.error("⚠️ Erro no backup Supabase:", supabaseError)
      // Não falhar o webhook por erro de backup
    }

    // Log específico baseado no status
    if (statusInfo.isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${paymentData.amount.toFixed(2)}`)
      console.log(`📅 Data do pagamento: ${paymentDate}`)
    } else if (statusInfo.isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
    } else {
      console.log(`ℹ️ Status SuperPayBR atualizado: ${statusInfo.name}`)
    }

    // SEMPRE retornar 200 OK para confirmar recebimento
    return NextResponse.json(
      {
        success: true,
        message: "Webhook SuperPayBR processado com sucesso",
        external_id: externalId,
        status: statusInfo.name,
        is_paid: statusInfo.isPaid,
        amount: paymentData.amount,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)

    // SEMPRE retornar 200 OK mesmo com erro para evitar reenvios
    return NextResponse.json(
      {
        success: true,
        message: "Webhook recebido (com erro interno)",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    storage_count: globalPaymentStorage.size,
    timestamp: new Date().toISOString(),
    supported_methods: ["POST"],
    webhook_format: "SuperPayBR v4 API",
  })
}

// Método OPTIONS para CORS se necessário
export async function OPTIONS() {
  return NextResponse.json(
    {
      success: true,
      message: "SuperPayBR Webhook OPTIONS",
    },
    {
      status: 200,
      headers: {
        Allow: "POST, GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
