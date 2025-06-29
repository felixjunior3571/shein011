import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🎭 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const paymentId = body.payment_id || body.id

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "payment_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🎯 Simulando pagamento para: ${paymentId}`)

    // Simular dados de pagamento aprovado
    const simulatedPayment = {
      id: paymentId,
      status: "paid",
      payment_status: "approved",
      amount: body.amount || 34.9,
      paid_at: new Date().toISOString(),
      payment_method: "pix",
      transaction_id: `TXN_${Date.now()}`,
    }

    // Salvar no Supabase como pagamento aprovado
    const { data, error } = await supabase
      .from("payments")
      .upsert(
        {
          payment_id: paymentId,
          status: "paid",
          amount: simulatedPayment.amount,
          provider: "superpaybr",
          webhook_data: simulatedPayment,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "payment_id",
        },
      )
      .select()

    if (error) {
      console.error("❌ Erro ao salvar pagamento simulado:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar pagamento simulado",
        },
        { status: 500 },
      )
    }

    console.log("✅ Pagamento simulado com sucesso!")
    console.log("💾 Dados salvos:", data)

    // Simular webhook (opcional)
    if (process.env.SUPERPAY_WEBHOOK_URL) {
      try {
        await fetch(process.env.SUPERPAY_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(simulatedPayment),
        })
        console.log("📡 Webhook simulado enviado")
      } catch (error) {
        console.log("⚠️ Erro ao enviar webhook simulado:", error)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        payment_id: paymentId,
        status: "paid",
        amount: simulatedPayment.amount,
        paid_at: simulatedPayment.paid_at,
        transaction_id: simulatedPayment.transaction_id,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao simular pagamento",
      },
      { status: 500 },
    )
  }
}
