import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Verificando pagamento SuperPayBR:", externalId)

    // Buscar no Supabase
    const { data, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("external_id", externalId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("❌ Erro ao buscar no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao verificar pagamento",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Pagamento não encontrado:", externalId)
      return NextResponse.json({
        success: true,
        found: false,
        message: "Pagamento não encontrado",
        external_id: externalId,
      })
    }

    const payment = data[0]
    console.log("✅ Pagamento encontrado:", payment)

    return NextResponse.json({
      success: true,
      found: true,
      payment: {
        external_id: payment.external_id,
        invoice_id: payment.invoice_id,
        status_code: payment.status_code,
        status_name: payment.status_name,
        amount: payment.amount,
        payment_date: payment.payment_date,
        is_paid: payment.is_paid,
        is_denied: payment.is_denied,
        is_expired: payment.is_expired,
        is_canceled: payment.is_canceled,
        is_refunded: payment.is_refunded,
        created_at: payment.created_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao verificar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
