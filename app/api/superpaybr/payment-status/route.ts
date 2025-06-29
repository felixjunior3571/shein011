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

    console.log("📊 Verificando status detalhado SuperPayBR:", externalId)

    // Buscar no Supabase com histórico
    const { data: payments, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("external_id", externalId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao buscar status:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao verificar status",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          found: false,
          status: "not_found",
          message: "Nenhum registro encontrado",
          history: [],
        },
      })
    }

    const latestPayment = payments[0]
    console.log("✅ Status encontrado:", latestPayment)

    // Buscar atualizações recentes
    const { data: updates, error: updatesError } = await supabase
      .from("payment_updates")
      .select("*")
      .eq("external_id", externalId)
      .order("created_at", { ascending: false })
      .limit(10)

    const history = updates || []

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        found: true,
        current_status: {
          invoice_id: latestPayment.invoice_id,
          status_code: latestPayment.status_code,
          status_name: latestPayment.status_name,
          amount: latestPayment.amount,
          is_paid: latestPayment.is_paid,
          is_denied: latestPayment.is_denied,
          is_refunded: latestPayment.is_refunded,
          is_expired: latestPayment.is_expired,
          is_canceled: latestPayment.is_canceled,
          payment_date: latestPayment.payment_date,
          processed_at: latestPayment.processed_at,
          created_at: latestPayment.created_at,
        },
        history: history.map((update) => ({
          update_data: update.update_data,
          created_at: update.created_at,
        })),
        summary: {
          total_updates: history.length,
          last_update: history[0]?.created_at || latestPayment.processed_at,
          is_final_status: latestPayment.is_paid || latestPayment.is_denied || latestPayment.is_expired,
        },
      },
    })
  } catch (error) {
    console.error("❌ Erro ao verificar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao verificar status",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
