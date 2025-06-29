import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📊 === STATUS PAGAMENTO SUPERPAYBR ===")
    console.log("🆔 External ID:", externalId)

    // Consultar apenas Supabase (dados do webhook)
    const { data: paymentData, error } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (error || !paymentData) {
      console.log("❌ Pagamento não encontrado no Supabase")
      return NextResponse.json(
        {
          success: false,
          error: "Pagamento não encontrado",
          external_id: externalId,
        },
        { status: 404 },
      )
    }

    console.log("✅ Status encontrado:", {
      status: paymentData.status,
      is_paid: paymentData.is_paid,
      amount: paymentData.amount,
    })

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        status: paymentData.status,
        is_paid: paymentData.is_paid,
        is_denied: paymentData.is_denied,
        is_expired: paymentData.is_expired,
        is_canceled: paymentData.is_canceled,
        is_refunded: paymentData.is_refunded,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        updated_at: paymentData.updated_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status:", error)
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
