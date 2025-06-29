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

    // Simular dados de pagamento aprovado
    const simulatedPaymentData = {
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5, // SuperPayBR: 5 = Pago
      statusName: "Pagamento Confirmado!",
      amount: Number.parseFloat(amount.toString()),
      paymentDate: new Date().toISOString(),
      webhook_data: {
        external_id,
        status: {
          code: 5,
          title: "Pagamento Confirmado!",
          text: "paid",
        },
        amount: Math.round(Number.parseFloat(amount.toString()) * 100),
        paid: true,
        paid_at: new Date().toISOString(),
        simulated: true,
      },
    }

    // Salvar no Supabase
    const { error } = await supabase.from("payment_webhooks").upsert(
      {
        external_id,
        payment_data: simulatedPaymentData,
        provider: "superpaybr",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "external_id",
      },
    )

    if (error) {
      console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
      return NextResponse.json({ success: false, error: "Erro ao salvar simulação" }, { status: 500 })
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso!",
      data: {
        external_id,
        status: "paid",
        amount: simulatedPaymentData.amount,
        payment_date: simulatedPaymentData.paymentDate,
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na simulação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
