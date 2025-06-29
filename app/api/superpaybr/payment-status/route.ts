import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoice_id")

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "invoice_id é obrigatório",
        },
        { status: 400 },
      )
    }

    // Buscar status no Supabase
    const { data: payment, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .single()

    if (error || !payment) {
      return NextResponse.json({
        success: false,
        error: "Pagamento não encontrado",
        invoice_id: invoiceId,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice_id: payment.invoice_id,
        external_id: payment.external_id,
        status: payment.status,
        amount: payment.amount,
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao buscar status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
