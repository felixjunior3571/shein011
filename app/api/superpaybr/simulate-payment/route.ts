import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_id, amount = 34.9 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🧪 Simulando pagamento SuperPayBR:", external_id)

    // Simular webhook de pagamento aprovado
    const simulatedWebhookData = {
      external_id,
      invoice_id: `SIM_${Date.now()}`,
      provider: "superpaybr",
      status_code: 5, // SuperPayBR: 5 = Pago
      status_title: "Pagamento Confirmado!",
      status_name: "paid",
      amount: Number.parseFloat(amount.toString()),
      is_paid: true,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      is_refunded: false,
      payment_date: new Date().toISOString(),
      webhook_data: {
        event: { type: "invoice.update", date: new Date().toISOString() },
        invoices: {
          id: `SIM_${Date.now()}`,
          external_id,
          status: { code: 5, title: "Pagamento Confirmado!" },
          amount: Number.parseFloat(amount.toString()),
        },
      },
      processed_at: new Date().toISOString(),
    }

    // Salvar no Supabase
    const { error: supabaseError } = await supabase.from("payment_webhooks").upsert(simulatedWebhookData, {
      onConflict: "external_id,provider",
    })

    if (supabaseError) {
      console.error("❌ Erro ao simular pagamento:", supabaseError)
      return NextResponse.json({ success: false, error: "Erro ao simular pagamento" }, { status: 500 })
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        external_id,
        status: "paid",
        amount: simulatedWebhookData.amount,
        payment_date: simulatedWebhookData.payment_date,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao simular pagamento SuperPayBR",
      },
      { status: 500 },
    )
  }
}
