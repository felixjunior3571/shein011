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

    console.log("🔍 Consultando status do pagamento SuperPayBR:", externalId)

    // Consultar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .eq("provider", "superpaybr")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.log("❌ Erro ao consultar Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
        },
        { status: 500 },
      )
    }

    if (data) {
      console.log("✅ Status encontrado no Supabase:", data)
      return NextResponse.json({
        success: true,
        data: {
          external_id: data.external_id,
          status: data.status_name,
          is_paid: data.is_paid,
          is_denied: data.is_denied,
          is_expired: data.is_expired,
          is_canceled: data.is_canceled,
          is_refunded: data.is_refunded,
          amount: data.amount,
          payment_date: data.payment_date,
          processed_at: data.processed_at,
        },
      })
    } else {
      console.log("⏳ Pagamento ainda não processado:", externalId)
      return NextResponse.json({
        success: true,
        data: null,
        message: "Pagamento ainda não processado",
      })
    }
  } catch (error) {
    console.log("❌ Erro ao consultar status do pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
      },
      { status: 500 },
    )
  }
}
