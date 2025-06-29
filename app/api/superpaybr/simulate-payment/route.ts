import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { globalPaymentStorage } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    const { external_id, amount } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🧪 Simulando pagamento SuperPayBR: ${external_id}`)

    const simulatedAmount = Number.parseFloat(amount?.toString() || "34.90")

    // Dados do pagamento simulado
    const paymentData = {
      external_id: external_id,
      invoice_id: external_id,
      status: {
        code: 2,
        text: "paid",
        title: "Pagamento Confirmado",
      },
      amount: simulatedAmount,
      payment_date: new Date().toISOString(),
      is_paid: true,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      is_refunded: false,
      webhook_received_at: new Date().toISOString(),
      simulated: true,
    }

    console.log("💾 Salvando pagamento simulado no armazenamento global")

    // Salvar no armazenamento global
    globalPaymentStorage.set(external_id, paymentData)

    // Backup no Supabase
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      await supabase.from("superpaybr_webhooks").upsert({
        external_id: external_id,
        invoice_id: external_id,
        status_code: 2,
        status_name: "paid",
        status_title: "Pagamento Confirmado",
        amount: simulatedAmount,
        payment_date: new Date().toISOString(),
        is_paid: true,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        webhook_data: { simulated: true },
        created_at: new Date().toISOString(),
      })

      console.log("✅ Backup da simulação no Supabase realizado")
    } catch (supabaseError) {
      console.error("⚠️ Erro no backup da simulação:", supabaseError)
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: paymentData,
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro na simulação",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Simulate Payment endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
