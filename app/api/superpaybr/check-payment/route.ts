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
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Verificando pagamento SuperPayBR:", externalId)

    // Buscar no Supabase
    const { data: payment, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao buscar pagamento:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao verificar pagamento",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!payment) {
      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          found: false,
          status: "not_found",
          message: "Pagamento não encontrado",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        found: true,
        payment_id: payment.payment_id,
        status: {
          code: payment.status_code,
          name: payment.status_name,
          is_paid: payment.is_paid,
          is_denied: payment.is_denied,
          is_refunded: payment.is_refunded,
          is_expired: payment.is_expired,
          is_canceled: payment.is_canceled,
        },
        amount: payment.amount,
        payment_date: payment.payment_date,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
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
