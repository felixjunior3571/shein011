import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

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

    // Dados simulados do webhook
    const simulatedWebhookData = {
      event: "payment.paid",
      data: {
        id: `SIM_${Date.now()}`,
        external_id: externalId,
        amount: body.amount || 34.9,
        status: {
          code: 5, // SuperPayBR: 5 = Pago
          name: "Pagamento Confirmado!",
        },
        paid_at: new Date().toISOString(),
      },
    }

    // Processar como se fosse um webhook real
    const statusData = {
      external_id: externalId,
      invoice_id: simulatedWebhookData.data.id,
      status_code: 5,
      status_name: "Pagamento Confirmado!",
      amount: Number.parseFloat(simulatedWebhookData.data.amount.toString()),
      is_paid: true,
      is_denied: false,
      is_refunded: false,
      is_expired: false,
      is_canceled: false,
      webhook_data: simulatedWebhookData,
      payment_date: new Date().toISOString(),
      processed_at: new Date().toISOString(),
    }

    // Salvar no Supabase
    const { data: savedData, error: saveError } = await supabase.from("superpaybr_payments").upsert(statusData, {
      onConflict: "external_id",
    })

    if (saveError) {
      console.error("❌ Erro ao salvar simulação:", saveError)
    } else {
      console.log("✅ Simulação salva no Supabase:", savedData)
    }

    // Broadcast para clientes conectados
    const broadcastData = {
      external_id: externalId,
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5,
      statusName: "Pagamento Confirmado!",
      amount: Number.parseFloat(simulatedWebhookData.data.amount.toString()),
      paymentDate: new Date().toISOString(),
    }

    const { error: broadcastError } = await supabase.from("payment_updates").insert({
      external_id: externalId,
      update_data: broadcastData,
      created_at: new Date().toISOString(),
    })

    if (broadcastError) {
      console.error("❌ Erro no broadcast da simulação:", broadcastError)
    } else {
      console.log("📡 Broadcast da simulação enviado:", broadcastData)
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso!",
      data: {
        external_id: externalId,
        simulated: true,
        status: "paid",
        amount: simulatedWebhookData.data.amount,
        simulated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao simular pagamento",
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
