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

    console.log("🔍 Consultando status SuperPayBR no Supabase:", externalId)

    // Buscar no Supabase APENAS (sem consultar API para evitar rate limit)
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.log("❌ Erro ao consultar Supabase SuperPayBR:", error)
      return NextResponse.json({ success: false, error: "Erro ao consultar status" }, { status: 500 })
    }

    if (!data) {
      console.log("ℹ️ Pagamento SuperPayBR não encontrado no Supabase:", externalId)
      return NextResponse.json({
        success: true,
        data: {
          isPaid: false,
          isDenied: false,
          isRefunded: false,
          isExpired: false,
          isCanceled: false,
          statusCode: 1,
          statusName: "Aguardando Pagamento",
          amount: 0,
          paymentDate: null,
        },
        message: "Pagamento não encontrado - aguardando webhook",
      })
    }

    console.log("✅ Status SuperPayBR encontrado no Supabase!")

    return NextResponse.json({
      success: true,
      data: data.payment_data,
      message: "Status SuperPayBR obtido do Supabase",
      last_updated: data.updated_at,
    })
  } catch (error) {
    console.log("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao consultar status SuperPayBR",
      },
      { status: 500 },
    )
  }
}
