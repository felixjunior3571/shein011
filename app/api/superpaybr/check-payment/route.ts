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
    const { data, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .eq("external_id", externalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
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

    if (!data) {
      console.log("⏳ Pagamento não encontrado:", externalId)
      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          status: "pending",
          is_paid: false,
          is_denied: false,
          is_refunded: false,
          is_expired: false,
          is_canceled: false,
          found: false,
        },
      })
    }

    console.log("✅ Pagamento encontrado:", data)

    return NextResponse.json({
      success: true,
      data: {
        external_id: data.external_id,
        status: data.status,
        status_code: data.status_code,
        amount: data.amount,
        payment_date: data.payment_date,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_refunded: data.is_refunded,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        found: true,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento:", error)
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

export async function POST(request: NextRequest) {
  const body = await request.json()
  const externalId = body.external_id

  if (!externalId) {
    return NextResponse.json(
      {
        success: false,
        error: "External ID é obrigatório",
      },
      { status: 400 },
    )
  }

  // Redirecionar para GET com query parameter
  const url = new URL(request.url)
  url.searchParams.set("external_id", externalId)

  return fetch(url.toString(), {
    method: "GET",
    headers: request.headers,
  })
}
