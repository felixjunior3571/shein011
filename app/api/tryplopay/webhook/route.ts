import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK RECEBIDO!")

    const body = await request.json()
    console.log("📦 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook
    const {
      external_id,
      invoice_id,
      token,
      status_code,
      status_name,
      status_description,
      amount,
      payment_date,
      is_paid,
      is_denied,
      is_refunded,
      is_expired,
      is_canceled,
    } = body

    if (!external_id) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID required" }, { status: 400 })
    }

    // Salvar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert({
        external_id,
        invoice_id,
        token,
        status_code,
        status_name,
        status_description,
        amount,
        payment_date,
        is_paid: is_paid || false,
        is_denied: is_denied || false,
        is_refunded: is_refunded || false,
        is_expired: is_expired || false,
        is_canceled: is_canceled || false,
        webhook_data: body,
        received_at: new Date().toISOString(),
      })
      .select()

    if (error) {
      console.error("❌ Erro ao salvar webhook no Supabase:", error)
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
    }

    console.log("✅ Webhook salvo no Supabase:", data)

    // Preparar dados para localStorage (será usado pelo frontend)
    const paymentStatus = {
      isPaid: is_paid || false,
      isDenied: is_denied || false,
      isRefunded: is_refunded || false,
      isExpired: is_expired || false,
      isCanceled: is_canceled || false,
      statusCode: status_code,
      statusName: status_name,
      amount: amount,
      paymentDate: payment_date,
    }

    // Log do status do pagamento
    if (is_paid) {
      console.log("🎉 PAGAMENTO CONFIRMADO via webhook!")
    } else if (is_denied) {
      console.log("❌ PAGAMENTO NEGADO via webhook!")
    } else if (is_expired) {
      console.log("⏰ PAGAMENTO VENCIDO via webhook!")
    } else if (is_canceled) {
      console.log("🚫 PAGAMENTO CANCELADO via webhook!")
    } else if (is_refunded) {
      console.log("🔄 PAGAMENTO ESTORNADO via webhook!")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      external_id,
      status: paymentStatus,
    })
  } catch (error) {
    console.error("❌ Erro no processamento do webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
