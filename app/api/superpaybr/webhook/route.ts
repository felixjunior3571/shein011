import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("📨 Webhook SuperPayBR recebido")

    const body = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(body, null, 2))

    // Verificar se é um evento de atualização de fatura
    if (body.event?.type !== "invoice.update") {
      console.log("ℹ️ Evento ignorado:", body.event?.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const invoice = body.invoices
    if (!invoice) {
      console.log("⚠️ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados da fatura não encontrados" })
    }

    const externalId = invoice.external_id || invoice.payment?.id
    const statusCode = invoice.status?.code
    const statusTitle = invoice.status?.title
    const statusName = invoice.status?.text || "unknown"

    console.log("🔍 Processando webhook SuperPayBR:", {
      external_id: externalId,
      status_code: statusCode,
      status_title: statusTitle,
    })

    // Determinar status do pagamento
    const isPaid = statusCode === 5 // SuperPayBR: 5 = Pago
    const isDenied = statusCode === 6 // SuperPayBR: 6 = Negado
    const isExpired = statusCode === 7 // SuperPayBR: 7 = Vencido
    const isCanceled = statusCode === 8 // SuperPayBR: 8 = Cancelado
    const isRefunded = statusCode === 9 // SuperPayBR: 9 = Estornado

    // Salvar no Supabase
    const webhookData = {
      external_id: externalId,
      invoice_id: invoice.id,
      provider: "superpaybr",
      status_code: statusCode,
      status_title: statusTitle,
      status_name: statusName,
      amount: invoice.amount || 0,
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
      payment_date: isPaid ? new Date().toISOString() : null,
      webhook_data: body,
      processed_at: new Date().toISOString(),
    }

    const { error: supabaseError } = await supabase.from("payment_webhooks").upsert(webhookData, {
      onConflict: "external_id,provider",
    })

    if (supabaseError) {
      console.error("❌ Erro ao salvar webhook no Supabase:", supabaseError)
      return NextResponse.json({ success: false, error: "Erro ao salvar webhook" }, { status: 500 })
    }

    console.log(`✅ Webhook SuperPayBR processado: ${statusTitle} (${statusCode})`)

    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      status: statusTitle,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no webhook SuperPayBR",
      },
      { status: 500 },
    )
  }
}
