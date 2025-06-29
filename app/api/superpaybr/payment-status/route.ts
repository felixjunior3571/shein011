import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

    console.log("🔍 Verificando status do pagamento SuperPayBR:", externalId)

    // Buscar no Supabase primeiro (dados do webhook)
    const { data: webhookData, error: supabaseError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .eq("provider", "superpaybr")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (webhookData && !supabaseError) {
      console.log("✅ Status encontrado no Supabase:", webhookData)

      return NextResponse.json({
        success: true,
        data: {
          external_id: webhookData.external_id,
          invoice_id: webhookData.invoice_id,
          status_code: webhookData.status_code,
          status_title: webhookData.status_title,
          amount: webhookData.amount,
          is_paid: webhookData.is_paid,
          is_denied: webhookData.is_denied,
          is_expired: webhookData.is_expired,
          is_canceled: webhookData.is_canceled,
          is_refunded: webhookData.is_refunded,
          payment_date: webhookData.payment_date,
          processed_at: webhookData.processed_at,
        },
        message: "Status obtido do webhook SuperPayBR",
      })
    } else {
      console.log("⚠️ Status não encontrado no Supabase - aguardando webhook")

      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          status: "waiting",
          message: "Aguardando confirmação via webhook SuperPayBR",
        },
      })
    }
  } catch (error) {
    console.log("❌ Erro ao verificar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao verificar status SuperPayBR",
      },
      { status: 500 },
    )
  }
}
