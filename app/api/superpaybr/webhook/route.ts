import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(webhookData, null, 2))

    // Extrair informações do webhook
    const eventType = webhookData.event || webhookData.type || "unknown"
    const invoiceId = webhookData.invoice_id || webhookData.id || webhookData.payment_id
    const status = webhookData.status || webhookData.payment_status
    const amount = webhookData.amount || webhookData.value
    const externalId = webhookData.external_id || webhookData.reference

    console.log("📋 Dados extraídos:", {
      eventType,
      invoiceId,
      status,
      amount,
      externalId,
    })

    // Salvar webhook no Supabase
    const { data: webhookRecord, error: webhookError } = await supabase
      .from("superpaybr_payments")
      .upsert(
        {
          invoice_id: invoiceId,
          external_id: externalId,
          status: status,
          amount: amount,
          event_type: eventType,
          webhook_data: webhookData,
          processed_at: new Date().toISOString(),
        },
        {
          onConflict: "invoice_id",
        },
      )
      .select()

    if (webhookError) {
      console.error("❌ Erro ao salvar webhook no Supabase:", webhookError)
    } else {
      console.log("✅ Webhook salvo no Supabase:", webhookRecord)
    }

    // Broadcast atualização em tempo real
    const { error: broadcastError } = await supabase.from("payment_updates").insert({
      invoice_id: invoiceId,
      external_id: externalId,
      status: status,
      event_type: eventType,
      amount: amount,
      timestamp: new Date().toISOString(),
    })

    if (broadcastError) {
      console.error("❌ Erro ao fazer broadcast:", broadcastError)
    } else {
      console.log("📡 Broadcast enviado com sucesso")
    }

    // Processar diferentes tipos de eventos
    switch (eventType) {
      case "payment.approved":
      case "invoice.paid":
        console.log("✅ Pagamento aprovado!")
        break
      case "payment.cancelled":
      case "invoice.cancelled":
        console.log("❌ Pagamento cancelado!")
        break
      case "payment.pending":
      case "invoice.pending":
        console.log("⏳ Pagamento pendente...")
        break
      default:
        console.log("ℹ️ Evento não reconhecido:", eventType)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      event_type: eventType,
      invoice_id: invoiceId,
      status: status,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
