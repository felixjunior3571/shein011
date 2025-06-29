import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "External ID é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 [SuperPayBR Check] Consultando pagamento para: ${externalId}`)

    // Buscar no Supabase (dados do webhook) - SEM POLLING na API externa
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", externalId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("❌ [SuperPayBR Check] Erro ao consultar Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (data) {
      console.log("✅ [SuperPayBR Check] Status encontrado no webhook:", {
        external_id: data.external_id,
        status: data.status_text,
        is_paid: data.is_paid,
        amount: data.amount,
        updated_at: data.updated_at,
      })

      return NextResponse.json({
        success: true,
        found: true,
        data: {
          isPaid: data.is_paid,
          isDenied: data.is_denied,
          isRefunded: data.is_refunded,
          isExpired: data.is_expired,
          isCanceled: data.is_canceled,
          statusCode: data.status_code,
          statusText: data.status_text,
          amount: data.amount,
          paymentDate: data.payment_date,
          updatedAt: data.updated_at,
        },
        source: "webhook",
      })
    } else {
      console.log(`⏳ [SuperPayBR Check] Nenhum webhook recebido ainda para: ${externalId}`)

      return NextResponse.json({
        success: true,
        found: false,
        message: "Aguardando webhook de confirmação",
        externalId,
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Check] Erro geral na consulta:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
