import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

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
    const { data, error } = await supabase
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

    if (!data) {
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

    console.log("✅ Pagamento encontrado:", data)

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        found: true,
        invoice_id: data.invoice_id,
        status_code: data.status_code,
        status_name: data.status_name,
        amount: data.amount,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_refunded: data.is_refunded,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        payment_date: data.payment_date,
        processed_at: data.processed_at,
        created_at: data.created_at,
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
