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

    console.log("🔍 Verificando status SuperPayBR:", externalId)

    // Buscar APENAS no Supabase (dados do webhook)
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
      return NextResponse.json({ success: false, error: "Erro ao verificar status" }, { status: 500 })
    }

    if (!data) {
      console.log("ℹ️ Status não encontrado - aguardando webhook")
      return NextResponse.json({
        success: true,
        found: false,
        status: "waiting",
        message: "Aguardando confirmação via webhook SuperPayBR",
      })
    }

    console.log("✅ Status encontrado:", {
      is_paid: data.is_paid,
      status_title: data.status_title,
      processed_at: data.processed_at,
    })

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        external_id: data.external_id,
        invoice_id: data.invoice_id,
        status_code: data.status_code,
        status_title: data.status_title,
        status_name: data.status_name,
        amount: data.amount,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        is_refunded: data.is_refunded,
        payment_date: data.payment_date,
        processed_at: data.processed_at,
      },
      message: data.is_paid ? "Pagamento confirmado!" : data.status_title,
    })
  } catch (error) {
    console.error("❌ Erro ao verificar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao verificar status SuperPayBR",
      },
      { status: 500 },
    )
  }
}
