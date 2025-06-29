import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 === CONSULTANDO PAGAMENTO SUPERPAYBR ===")

    const searchParams = request.nextUrl.searchParams
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

    console.log("🔎 Consultando external_id:", externalId)

    const { data, error } = await supabase.from("payments").select("*").eq("external_id", externalId).maybeSingle()

    if (error) {
      console.error("❌ Erro na consulta Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na consulta do banco de dados",
        },
        { status: 500 },
      )
    }

    const found = !!data
    console.log(`📊 Pagamento ${found ? "ENCONTRADO" : "NÃO ENCONTRADO"}`)

    if (found) {
      console.log("💰 Dados do pagamento:", {
        status_code: data.status_code,
        is_paid: data.is_paid,
        amount: data.amount,
        payment_date: data.payment_date,
      })
    }

    return NextResponse.json({
      success: true,
      found,
      data: data || null,
      status: {
        isPaid: data?.is_paid || false,
        isDenied: data?.is_denied || false,
        isRefunded: data?.is_refunded || false,
        isExpired: data?.is_expired || false,
        isCanceled: data?.is_canceled || false,
        statusCode: data?.status_code || null,
        statusName: data?.status_text || null,
        amount: data?.amount || 0,
        paymentDate: data?.payment_date || null,
      },
    })
  } catch (error) {
    console.error("❌ Erro na consulta de pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na consulta",
      },
      { status: 500 },
    )
  }
}
