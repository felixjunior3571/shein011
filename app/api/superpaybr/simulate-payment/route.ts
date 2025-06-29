import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount = 34.9, status = "paid" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🧪 Simulando pagamento:", {
      external_id,
      amount,
      status,
    })

    // Determinar status baseado no parâmetro
    let isPaid = false
    let isDenied = false
    let statusCode = 1

    switch (status.toLowerCase()) {
      case "paid":
      case "pago":
        isPaid = true
        statusCode = 5
        break
      case "denied":
      case "negado":
        isDenied = true
        statusCode = 3
        break
      default:
        statusCode = 1 // Pendente
    }

    // Salvar simulação no Supabase
    const { data: insertData, error: insertError } = await supabase.from("superpaybr_payments").insert({
      external_id: external_id,
      status: status,
      status_code: statusCode,
      amount: amount,
      payment_date: new Date().toISOString(),
      is_paid: isPaid,
      is_denied: isDenied,
      is_refunded: false,
      is_expired: false,
      is_canceled: false,
      webhook_data: {
        simulated: true,
        external_id: external_id,
        status: status,
        amount: amount,
      },
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("❌ Erro ao salvar simulação:", insertError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar simulação",
          details: insertError.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Pagamento simulado com sucesso:", insertData)

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        external_id: external_id,
        status: status,
        status_code: statusCode,
        amount: amount,
        is_paid: isPaid,
        is_denied: isDenied,
        simulated: true,
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para simular pagamento.",
    },
    { status: 405 },
  )
}
