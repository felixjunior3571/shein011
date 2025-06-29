import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoice_id")
    const externalId = searchParams.get("external_id")

    if (!invoiceId && !externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "invoice_id ou external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📊 === CONSULTANDO STATUS PAGAMENTO ===")
    console.log("📋 Parâmetros:", { invoiceId, externalId })

    // Consultar no Supabase
    let query = supabase.from("superpaybr_payments").select("*")

    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    } else if (externalId) {
      query = query.eq("external_id", externalId)
    }

    const { data: payments, error } = await query.order("created_at", { ascending: false }).limit(1)

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

    if (!payments || payments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Pagamento não encontrado",
          invoice_id: invoiceId,
          external_id: externalId,
        },
        { status: 404 },
      )
    }

    const payment = payments[0]
    const isPaid = payment.status === "paid" || payment.status === "approved" || payment.status === "completed"

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: payment.invoice_id,
        external_id: payment.external_id,
        status: payment.status,
        amount: payment.amount,
        is_paid: isPaid,
        event_type: payment.event_type,
        created_at: payment.created_at,
        processed_at: payment.processed_at,
        webhook_data: payment.webhook_data,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status do pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar status do pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
