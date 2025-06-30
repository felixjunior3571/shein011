import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPayBR
const STATUS_MAP = {
  1: { name: "pending", title: "Aguardando Pagamento" },
  2: { name: "processing", title: "Em Processamento" },
  3: { name: "scheduled", title: "Pagamento Agendado" },
  4: { name: "authorized", title: "Autorizado" },
  5: { name: "paid", title: "Pago" }, // ✅ PAGO
  6: { name: "canceled", title: "Cancelado" },
  7: { name: "refund_pending", title: "Aguardando Estorno" },
  8: { name: "partially_refunded", title: "Parcialmente Estornado" },
  9: { name: "refunded", title: "Estornado" },
  10: { name: "disputed", title: "Contestado/Em Contestação" },
  12: { name: "denied", title: "Pagamento Negado" }, // ❌ NEGADO
  15: { name: "expired", title: "Pagamento Vencido" }, // ⏰ VENCIDO
  16: { name: "error", title: "Erro no Pagamento" },
} as const

export async function POST(request: NextRequest) {
  try {
    console.log("🚨🚨🚨 [SuperPayBR Webhook] WEBHOOK RECEBIDO 🚨🚨🚨")

    const body = await request.json()
    console.log("📥 [SuperPayBR Webhook] Dados recebidos:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook SuperPayBR
    if (!body.event || !body.invoices) {
      console.log("❌ [SuperPayBR Webhook] Estrutura inválida")
      return NextResponse.json({ error: "Invalid webhook structure" }, { status: 400 })
    }

    const { event, invoices } = body
    const invoice = invoices

    console.log("📋 [SuperPayBR Webhook] Processando:")
    console.log("- Event Type:", event.type)
    console.log("- Invoice ID:", invoice.id)
    console.log("- External ID:", invoice.external_id)
    console.log("- Status Code:", invoice.status.code)
    console.log("- Status Title:", invoice.status.title)

    if (!invoice.external_id) {
      console.log("❌ [SuperPayBR Webhook] External ID não encontrado")
      return NextResponse.json({ error: "External ID not found" }, { status: 400 })
    }

    // Mapear status SuperPayBR
    const statusInfo = STATUS_MAP[invoice.status.code as keyof typeof STATUS_MAP] || {
      name: "unknown",
      title: "Status Desconhecido",
    }

    const isPaid = invoice.status.code === 5 // SuperPayBR: 5 = Pago
    const isDenied = invoice.status.code === 12 // SuperPayBR: 12 = Negado
    const isExpired = invoice.status.code === 15 // SuperPayBR: 15 = Vencido
    const isCanceled = invoice.status.code === 6 // SuperPayBR: 6 = Cancelado
    const isRefunded = invoice.status.code === 9 || invoice.status.code === 8 // SuperPayBR: 9 = Estornado, 8 = Parcial

    console.log("🔍 [SuperPayBR Webhook] Status processado:")
    console.log("- isPaid:", isPaid)
    console.log("- isDenied:", isDenied)
    console.log("- isExpired:", isExpired)
    console.log("- isCanceled:", isCanceled)
    console.log("- isRefunded:", isRefunded)

    // Preparar dados para Supabase
    const webhookData = {
      external_id: invoice.external_id,
      invoice_id: invoice.id,
      status_code: invoice.status.code,
      status_name: statusInfo.name,
      status_title: statusInfo.title,
      amount: (invoice.prices?.total || 0) / 100, // SuperPayBR retorna em centavos
      payment_date: invoice.payment?.payDate || (isPaid ? new Date().toISOString() : null),
      webhook_data: body,
      processed_at: new Date().toISOString(),
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
      gateway: "superpaybr",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("💾 [SuperPayBR Webhook] Salvando no Supabase:", webhookData)

    // Salvar/atualizar no Supabase usando upsert
    const { data: supabaseData, error: supabaseError } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
        onConflict: "external_id",
      })
      .select()

    if (supabaseError) {
      console.log("❌ [SuperPayBR Webhook] Erro ao salvar no Supabase:", supabaseError)
    } else {
      console.log("✅ [SuperPayBR Webhook] Dados salvos no Supabase:", supabaseData)
    }

    // Salvar no localStorage para acesso imediato do frontend
    const localStorageData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode: invoice.status.code,
      statusName: statusInfo.title,
      amount: webhookData.amount,
      paymentDate: webhookData.payment_date || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      source: "webhook",
    }

    console.log("💾 [SuperPayBR Webhook] Dados para localStorage:", localStorageData)
    console.log(`🔑 [SuperPayBR Webhook] Chave: webhook_payment_${invoice.external_id}`)

    // Log especial para status importantes
    if (isPaid) {
      console.log("🎉🎉🎉 [SuperPayBR Webhook] PAGAMENTO CONFIRMADO! 🎉🎉🎉")
      console.log(`💰 Valor: R$ ${webhookData.amount.toFixed(2)}`)
      console.log(`🆔 External ID: ${invoice.external_id}`)
    } else if (isDenied) {
      console.log("❌ [SuperPayBR Webhook] PAGAMENTO NEGADO!")
    } else if (isExpired) {
      console.log("⏰ [SuperPayBR Webhook] PAGAMENTO VENCIDO!")
    } else if (isCanceled) {
      console.log("🚫 [SuperPayBR Webhook] PAGAMENTO CANCELADO!")
    } else if (isRefunded) {
      console.log("🔄 [SuperPayBR Webhook] PAGAMENTO ESTORNADO!")
    }

    return NextResponse.json({
      success: true,
      status: "processed",
      data: {
        external_id: invoice.external_id,
        invoice_id: invoice.id,
        status_code: invoice.status.code,
        status_name: statusInfo.title,
        is_paid: isPaid,
        is_denied: isDenied,
        is_expired: isExpired,
        is_canceled: isCanceled,
        is_refunded: isRefunded,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook] Erro ao processar:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Método GET para informações do webhook
export async function GET() {
  try {
    console.log("📊 [SuperPayBR Webhook] Consultando estatísticas...")

    // Buscar estatísticas no Supabase
    const { data: webhooks, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpaybr")
      .order("created_at", { ascending: false })
      .limit(10)

    const stats = {
      total: webhooks?.length || 0,
      paid: webhooks?.filter((w) => w.is_paid).length || 0,
      pending: webhooks?.filter((w) => !w.is_paid && !w.is_denied && !w.is_expired).length || 0,
      denied: webhooks?.filter((w) => w.is_denied).length || 0,
      expired: webhooks?.filter((w) => w.is_expired).length || 0,
      recent: webhooks || [],
    }

    return NextResponse.json({
      success: true,
      message: "SuperPayBR Webhook endpoint ativo",
      statistics: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook] Erro ao consultar estatísticas:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao consultar estatísticas",
      },
      { status: 500 },
    )
  }
}
