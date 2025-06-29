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

    console.log("📊 Consultando status do pagamento SuperPayBR:", externalId)

    // Buscar no Supabase
    const { data: payment, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("external_id", externalId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao consultar status:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar status do pagamento",
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
          status: "pending",
          message: "Aguardando confirmação do pagamento",
          is_paid: false,
          is_denied: false,
          is_refunded: false,
          is_expired: false,
          is_canceled: false,
        },
      })
    }

    // Determinar status principal
    let mainStatus = "pending"
    if (payment.is_paid) mainStatus = "paid"
    else if (payment.is_denied) mainStatus = "denied"
    else if (payment.is_refunded) mainStatus = "refunded"
    else if (payment.is_expired) mainStatus = "expired"
    else if (payment.is_canceled) mainStatus = "canceled"

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        payment_id: payment.payment_id,
        status: mainStatus,
        status_code: payment.status_code,
        status_name: payment.status_name,
        is_paid: payment.is_paid,
        is_denied: payment.is_denied,
        is_refunded: payment.is_refunded,
        is_expired: payment.is_expired,
        is_canceled: payment.is_canceled,
        amount: payment.amount,
        payment_date: payment.payment_date,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        last_check: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar status",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
