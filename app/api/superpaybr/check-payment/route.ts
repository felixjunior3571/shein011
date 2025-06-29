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

    // ⚠️ IMPORTANTE: Buscar APENAS no Supabase para evitar rate limit
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .eq("provider", "superpaybr")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao consultar Supabase:", error)
      return NextResponse.json({ success: false, error: "Erro ao verificar pagamento" }, { status: 500 })
    }

    if (!data) {
      // Não encontrado - aguardando webhook
      return NextResponse.json({
        success: true,
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
        statusCode: 1,
        statusName: "pending",
        message: "Aguardando confirmação via webhook SuperPayBR",
      })
    }

    // Encontrado no Supabase
    return NextResponse.json({
      success: true,
      isPaid: data.is_paid,
      isDenied: data.is_denied,
      isExpired: data.is_expired,
      isCanceled: data.is_canceled,
      isRefunded: data.is_refunded,
      statusCode: data.status_code,
      statusName: data.status_name,
      statusTitle: data.status_title,
      amount: data.amount,
      paymentDate: data.payment_date,
      message: data.is_paid ? "Pagamento confirmado!" : "Aguardando pagamento",
      last_updated: data.processed_at,
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao verificar pagamento SuperPayBR",
      },
      { status: 500 },
    )
  }
}
