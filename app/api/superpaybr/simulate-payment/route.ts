import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const invoiceId = body.invoice_id || body.external_id

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "invoice_id é obrigatório",
        },
        { status: 400 },
      )
    }

    // Simular pagamento aprovado
    const simulatedPayment = {
      invoice_id: invoiceId,
      external_id: invoiceId,
      status: "paid",
      amount: body.amount || 34.9,
      payment_method: "pix",
      webhook_data: {
        id: invoiceId,
        status: "paid",
        amount: body.amount || 34.9,
        payment_method: "pix",
        paid_at: new Date().toISOString(),
        simulated: true,
      },
      updated_at: new Date().toISOString(),
    }

    // Salvar no Supabase
    const { data, error } = await supabase.from("superpaybr_payments").upsert(simulatedPayment, {
      onConflict: "invoice_id",
    })

    if (error) {
      throw new Error(`Erro ao salvar simulação: ${error.message}`)
    }

    // Broadcast atualização
    await supabase.from("payment_updates").insert({
      invoice_id: invoiceId,
      status: "paid",
      amount: body.amount || 34.9,
      timestamp: new Date().toISOString(),
    })

    console.log("✅ Pagamento simulado com sucesso")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: simulatedPayment,
    })
  } catch (error) {
    console.error("❌ Erro na simulação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação de pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
