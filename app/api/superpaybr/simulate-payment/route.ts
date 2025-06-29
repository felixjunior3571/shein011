import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { invoice_id, external_id, status = "paid" } = body

    if (!invoice_id && !external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "invoice_id ou external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📋 Simulando pagamento:", { invoice_id, external_id, status })

    // Simular dados do webhook
    const webhookData = {
      event: "payment.approved",
      invoice_id: invoice_id || external_id,
      external_id: external_id || invoice_id,
      status: status,
      amount: 34.9,
      payment_method: "pix",
      paid_at: new Date().toISOString(),
      customer: {
        name: "Cliente Teste",
        document: "00000000000",
        email: "teste@shein.com",
      },
      metadata: {
        simulated: true,
        timestamp: new Date().toISOString(),
      },
    }

    // Salvar no Supabase
    const { data: paymentRecord, error: paymentError } = await supabase
      .from("superpaybr_payments")
      .upsert(
        {
          invoice_id: invoice_id || external_id,
          external_id: external_id || invoice_id,
          status: status,
          amount: 34.9,
          event_type: "payment.approved",
          webhook_data: webhookData,
          processed_at: new Date().toISOString(),
        },
        {
          onConflict: "invoice_id",
        },
      )
      .select()

    if (paymentError) {
      console.error("❌ Erro ao salvar simulação:", paymentError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar simulação de pagamento",
          details: paymentError.message,
        },
        { status: 500 },
      )
    }

    // Broadcast atualização
    const { error: broadcastError } = await supabase.from("payment_updates").insert({
      invoice_id: invoice_id || external_id,
      external_id: external_id || invoice_id,
      status: status,
      event_type: "payment.approved",
      amount: 34.9,
      timestamp: new Date().toISOString(),
    })

    if (broadcastError) {
      console.error("❌ Erro ao fazer broadcast da simulação:", broadcastError)
    }

    console.log("✅ Pagamento simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        invoice_id: invoice_id || external_id,
        external_id: external_id || invoice_id,
        status: status,
        amount: 34.9,
        simulated: true,
        webhook_data: webhookData,
        payment_record: paymentRecord,
        simulated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao simular pagamento SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
