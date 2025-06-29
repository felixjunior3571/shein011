import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎭 Simulando pagamento para:", external_id)

    // Simular dados de webhook de pagamento aprovado
    const simulatedWebhookData = {
      external_id,
      invoice_id: `SIM_${Date.now()}`,
      token: `sim_token_${Date.now()}`,
      amount: amount || 34.9,
      status_code: 5, // 5 = Pagamento Confirmado
      status_text: "Pagamento Confirmado (Simulado)",
      payment_date: new Date().toISOString(),
      is_paid: true,
      is_refunded: false,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      updated_at: new Date().toISOString(),
    }

    // Salvar no Supabase como se fosse um webhook real
    const { data, error } = await supabase.from("payments").upsert(simulatedWebhookData, { onConflict: "external_id" })

    if (error) {
      console.error("❌ Erro ao simular no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar simulação no banco",
        },
        { status: 500 },
      )
    }

    console.log("✅ Pagamento simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        external_id,
        status: "paid",
        amount: simulatedWebhookData.amount,
        payment_date: simulatedWebhookData.payment_date,
        simulated: true,
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
      },
      { status: 500 },
    )
  }
}
