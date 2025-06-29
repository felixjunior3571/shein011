import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
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

    console.log("🔍 === VERIFICANDO PAGAMENTO SUPERPAYBR ===")
    console.log("🆔 External ID:", externalId)

    // Consultar Supabase primeiro
    const { data: paymentData, error: supabaseError } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (supabaseError && supabaseError.code !== "PGRST116") {
      console.error("❌ Erro ao consultar Supabase:", supabaseError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
        },
        { status: 500 },
      )
    }

    if (paymentData) {
      console.log("✅ Pagamento encontrado no Supabase:", {
        status: paymentData.status,
        is_paid: paymentData.is_paid,
        amount: paymentData.amount,
      })

      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          status: paymentData.status,
          is_paid: paymentData.is_paid,
          is_denied: paymentData.is_denied,
          is_expired: paymentData.is_expired,
          is_canceled: paymentData.is_canceled,
          is_refunded: paymentData.is_refunded,
          amount: paymentData.amount,
          payment_date: paymentData.payment_date,
          updated_at: paymentData.updated_at,
        },
        source: "database",
      })
    }

    console.log("⚠️ Pagamento não encontrado no banco de dados")

    // Se não encontrou no banco, retornar status pendente
    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        status: "Aguardando Pagamento",
        is_paid: false,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        amount: 0,
        payment_date: null,
        updated_at: new Date().toISOString(),
      },
      source: "default",
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao verificar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
