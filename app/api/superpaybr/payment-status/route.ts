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

    console.log("📊 Consultando status do pagamento SuperPayBR:", externalId)

    // Buscar no Supabase
    const { data, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("external_id", externalId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("❌ Erro ao consultar Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar status do pagamento",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Status não encontrado:", externalId)
      return NextResponse.json({
        success: true,
        found: false,
        status: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 0,
          statusName: "Não encontrado",
        },
        external_id: externalId,
      })
    }

    const payment = data[0]
    console.log("✅ Status encontrado:", {
      external_id: payment.external_id,
      is_paid: payment.is_paid,
      status_name: payment.status_name,
    })

    return NextResponse.json({
      success: true,
      found: true,
      status: {
        isPaid: payment.is_paid,
        isDenied: payment.is_denied,
        isExpired: payment.is_expired,
        isCanceled: payment.is_canceled,
        isRefunded: payment.is_refunded,
        statusCode: payment.status_code,
        statusName: payment.status_name,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        lastUpdate: payment.created_at,
      },
      external_id: externalId,
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
