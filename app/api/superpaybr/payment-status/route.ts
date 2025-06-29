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

    console.log("🔍 Verificando status do pagamento SuperPayBR:", externalId)

    // ⚠️ IMPORTANTE: Evitar cron job - usar apenas Supabase primeiro
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
      console.log("✅ Status encontrado no Supabase (webhook):", webhookData)

      return NextResponse.json({
        success: true,
        data: {
          external_id: webhookData.external_id,
          invoice_id: webhookData.invoice_id,
          status_code: webhookData.status_code,
          status_name: webhookData.status_name,
          status_title: webhookData.status_title,
          amount: webhookData.amount,
          payment_date: webhookData.payment_date,
          is_paid: webhookData.is_paid,
          is_denied: webhookData.is_denied,
          is_expired: webhookData.is_expired,
          is_canceled: webhookData.is_canceled,
          is_refunded: webhookData.is_refunded,
          provider: "superpaybr",
          source: "webhook",
        },
        message: "Status obtido via webhook SuperPayBR",
      })
    }

    console.log("⚠️ Dados não encontrados no Supabase, retornando status pendente")

    // Se não encontrou no Supabase, retornar status pendente
    // ⚠️ NÃO fazer consulta na API para evitar rate limit
    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        status_code: 1,
        status_name: "pending",
        status_title: "Aguardando Pagamento",
        is_paid: false,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        provider: "superpaybr",
        source: "default",
      },
      message: "Status padrão - aguardando webhook SuperPayBR",
    })
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
