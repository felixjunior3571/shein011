import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { externalId, amount = 34.9 } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento:", { externalId, amount })

    // Simular dados de webhook de pagamento aprovado
    const simulatedWebhookData = {
      invoices: {
        id: externalId,
        external_id: externalId,
        status: 5, // SuperPayBR: 5 = Pago
        amount: amount,
        payment_date: new Date().toISOString(),
        payment_method: "PIX",
      },
    }

    // Processar como se fosse um webhook real
    const webhookData = {
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5,
      statusName: "Pagamento Confirmado!",
      amount: amount,
      paymentDate: new Date().toISOString(),
      rawData: simulatedWebhookData.invoices,
    }

    // Salvar no Supabase
    const { data: savedData, error: supabaseError } = await supabase
      .from("payments")
      .upsert(
        {
          external_id: externalId,
          status: "Pagamento Confirmado!",
          amount: amount,
          is_paid: true,
          is_denied: false,
          is_expired: false,
          is_canceled: false,
          is_refunded: false,
          payment_date: new Date().toISOString(),
          webhook_data: simulatedWebhookData.invoices,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      )
      .select()

    if (supabaseError) {
      console.error("❌ Erro ao salvar simulação no Supabase:", supabaseError)
    } else {
      console.log("✅ Simulação salva no Supabase:", savedData)
    }

    console.log("🎉 Pagamento simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      data: {
        external_id: externalId,
        status: "Pagamento Confirmado!",
        is_paid: true,
        amount: amount,
        payment_date: new Date().toISOString(),
        simulated: true,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento:", error)
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
