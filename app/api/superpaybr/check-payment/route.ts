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

    // Buscar APENAS no Supabase (sem consultar API para evitar rate limit)
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.log("❌ Erro ao verificar pagamento SuperPayBR:", error)
      return NextResponse.json({ success: false, error: "Erro ao verificar pagamento" }, { status: 500 })
    }

    if (!data) {
      console.log("ℹ️ Pagamento SuperPayBR não encontrado:", externalId)
      return NextResponse.json({
        success: true,
        isPaid: false,
        message: "Pagamento não encontrado - aguardando webhook",
      })
    }

    const paymentData = data.payment_data
    console.log("✅ Pagamento SuperPayBR encontrado:", {
      isPaid: paymentData.isPaid,
      statusCode: paymentData.statusCode,
      statusName: paymentData.statusName,
    })

    return NextResponse.json({
      success: true,
      isPaid: paymentData.isPaid,
      isDenied: paymentData.isDenied,
      isExpired: paymentData.isExpired,
      isCanceled: paymentData.isCanceled,
      isRefunded: paymentData.isRefunded,
      statusCode: paymentData.statusCode,
      statusName: paymentData.statusName,
      amount: paymentData.amount,
      paymentDate: paymentData.paymentDate,
      message: paymentData.isPaid ? "Pagamento confirmado!" : "Aguardando pagamento",
      last_updated: data.updated_at,
    })
  } catch (error) {
    console.log("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao verificar pagamento SuperPayBR",
      },
      { status: 500 },
    )
  }
}
