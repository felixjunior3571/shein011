import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook SuperPayBR:", JSON.stringify(body, null, 2))

    // Verificar se é um evento de atualização de fatura
    if (body.event?.type !== "invoice.update") {
      console.log("⚠️ Evento não é invoice.update, ignorando")
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const invoice = body.invoices || body.invoice
    if (!invoice) {
      console.log("❌ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados da fatura não encontrados" }, { status: 400 })
    }

    const externalId = invoice.external_id || invoice.payment?.id
    const statusCode = invoice.status?.code
    const statusTitle = invoice.status?.title || "Status desconhecido"
    const statusText = invoice.status?.text || "unknown"

    console.log("🔍 Dados extraídos do webhook:", {
      externalId,
      statusCode,
      statusTitle,
      statusText,
    })

    if (!externalId) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID não encontrado" }, { status: 400 })
    }

    // Determinar status do pagamento baseado no código SuperPayBR
    const isPaid = statusCode === 5 // SuperPayBR: 5 = Pago
    const isDenied = statusCode === 6 // SuperPayBR: 6 = Negado
    const isExpired = statusCode === 7 // SuperPayBR: 7 = Vencido
    const isCanceled = statusCode === 8 // SuperPayBR: 8 = Cancelado
    const isRefunded = statusCode === 9 // SuperPayBR: 9 = Reembolsado

    console.log("📊 Status do pagamento:", {
      isPaid,
      isDenied,
      isExpired,
      isCanceled,
      isRefunded,
    })

    // Preparar dados para salvar no Supabase
    const webhookData = {
      external_id: externalId,
      invoice_id: invoice.id || invoice.invoice_id || externalId,
      provider: "superpaybr",
      status_code: statusCode,
      status_name: statusText,
      status_title: statusTitle,
      amount: (invoice.valores?.bruto || invoice.amount || 0) / 100, // SuperPayBR usa centavos
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
      payment_date: isPaid ? new Date().toISOString() : null,
      webhook_data: body,
      processed_at: new Date().toISOString(),
    }

    console.log("💾 Salvando no Supabase:", webhookData)

    // Salvar no Supabase
    const { data, error } = await supabase.from("payment_webhooks").upsert(webhookData, {
      onConflict: "external_id,provider",
    })

    if (error) {
      console.log("❌ Erro ao salvar no Supabase:", error)
      return NextResponse.json({ success: false, error: "Erro ao salvar webhook" }, { status: 500 })
    }

    console.log("✅ Webhook SuperPayBR processado e salvo com sucesso!")

    // Log específico para pagamentos confirmados
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${webhookData.amount.toFixed(2)}`)
      console.log(`👤 External ID: ${externalId}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      data: {
        external_id: externalId,
        status: statusTitle,
        is_paid: isPaid,
      },
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no webhook SuperPayBR",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
