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
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Verificando status do pagamento SuperPayBR: ${externalId}`)

    // Consultar APENAS dados locais (Supabase) - ZERO polling na API externa
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", externalId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("❌ Erro ao consultar status no Supabase:", error)
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
      console.log("✅ Status encontrado via webhook:", {
        external_id: data.external_id,
        status: data.status_text,
        is_paid: data.is_paid,
        amount: data.amount,
      })

      return NextResponse.json({
        success: true,
        found: true,
        isPaid: data.is_paid,
        isDenied: data.is_denied,
        isRefunded: data.is_refunded,
        isExpired: data.is_expired,
        isCanceled: data.is_canceled,
        statusCode: data.status_code,
        statusName: data.status_text,
        amount: data.amount,
        paymentDate: data.payment_date,
        timestamp: data.updated_at,
        source: "webhook",
      })
    } else {
      console.log(`ℹ️ Nenhum webhook recebido ainda para: ${externalId}`)

      return NextResponse.json({
        success: true,
        found: false,
        isPaid: false,
        isDenied: false,
        isRefunded: false,
        isExpired: false,
        isCanceled: false,
        statusCode: 1,
        statusName: "Aguardando Pagamento",
        amount: 0,
        paymentDate: null,
        timestamp: new Date().toISOString(),
        source: "pending",
        message: "Aguardando confirmação via webhook",
      })
    }
  } catch (error) {
    console.error("❌ Erro ao verificar status do pagamento:", error)
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
