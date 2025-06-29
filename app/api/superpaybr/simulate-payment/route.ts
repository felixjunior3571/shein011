import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const externalId = body.external_id

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento para:", externalId)

    // Simular dados de webhook
    const simulatedWebhookData = {
      id: `SIM_${Date.now()}`,
      external_id: externalId,
      status: {
        code: 5, // SuperPayBR: 5 = Pago
        name: "Pagamento Confirmado",
        title: "Pago",
      },
      amount: body.amount || 34.9,
      payment_date: new Date().toISOString(),
      webhook_data: {
        simulated: true,
        simulated_at: new Date().toISOString(),
        original_request: body,
      },
    }

    // Salvar no Supabase
    const { data: savedPayment, error: saveError } = await supabase
      .from("superpaybr_payments")
      .upsert(
        {
          external_id: externalId,
          payment_id: simulatedWebhookData.id,
          status_code: 5,
          status_name: "Pagamento Confirmado",
          amount: simulatedWebhookData.amount,
          is_paid: true,
          is_denied: false,
          is_refunded: false,
          is_expired: false,
          is_canceled: false,
          webhook_data: simulatedWebhookData,
          payment_date: simulatedWebhookData.payment_date,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )
      .select()

    if (saveError) {
      console.error("❌ Erro ao salvar simulação:", saveError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar simulação",
          details: saveError.message,
        },
        { status: 500 },
      )
    }

    // Broadcast update
    const { error: broadcastError } = await supabase.from("payment_updates").insert({
      external_id: externalId,
      status_code: 5,
      status_name: "Pagamento Confirmado",
      is_paid: true,
      is_denied: false,
      is_refunded: false,
      is_expired: false,
      is_canceled: false,
      amount: simulatedWebhookData.amount,
      payment_date: simulatedWebhookData.payment_date,
    })

    if (broadcastError) {
      console.error("❌ Erro no broadcast da simulação:", broadcastError)
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso!",
      data: {
        external_id: externalId,
        payment_id: simulatedWebhookData.id,
        status: "paid",
        amount: simulatedWebhookData.amount,
        payment_date: simulatedWebhookData.payment_date,
        simulated: true,
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para simular pagamento.",
    },
    { status: 405 },
  )
}
