import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")

    console.log("🔍 [SuperPayBR Check] Verificando pagamento:")
    console.log("- External ID:", externalId)
    console.log("- Invoice ID:", invoiceId)

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID ou Invoice ID é obrigatório",
        },
        { status: 400 },
      )
    }

    // Buscar no Supabase primeiro
    let query = supabase.from("payment_webhooks").select("*")

    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    }

    const { data: webhookData, error: supabaseError } = await query.order("created_at", { ascending: false }).limit(1)

    if (supabaseError) {
      console.log("❌ [SuperPayBR Check] Erro no Supabase:", supabaseError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
          message: supabaseError.message,
        },
        { status: 500 },
      )
    }

    if (webhookData && webhookData.length > 0) {
      const payment = webhookData[0]
      console.log("✅ [SuperPayBR Check] Dados encontrados no Supabase:", payment)

      const responseData = {
        external_id: payment.external_id,
        invoice_id: payment.invoice_id,
        status_code: payment.status_code,
        status_name: payment.status_name,
        amount: payment.amount,
        is_paid: payment.is_paid,
        is_denied: payment.is_denied,
        is_expired: payment.is_expired,
        is_canceled: payment.is_canceled,
        is_refunded: payment.is_refunded,
        payment_date: payment.payment_date,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
      }

      return NextResponse.json({
        success: true,
        data: responseData,
        source: "supabase",
        timestamp: new Date().toISOString(),
      })
    }

    // Se não encontrou no Supabase, tentar consultar API SuperPayBR
    console.log("⚠️ [SuperPayBR Check] Dados não encontrados no Supabase, consultando API...")

    try {
      const statusResponse = await fetch(
        `${request.nextUrl.origin}/api/superpaybr/payment-status?invoiceId=${invoiceId || externalId}`,
      )

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        console.log("📡 [SuperPayBR Check] Resposta da API SuperPayBR:", statusData)

        if (statusData.success && statusData.data) {
          return NextResponse.json({
            success: true,
            data: statusData.data,
            source: "superpaybr_api",
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch (apiError) {
      console.log("⚠️ [SuperPayBR Check] Erro na API SuperPayBR:", apiError)
    }

    // Retornar status padrão se nada foi encontrado
    console.log("⏳ [SuperPayBR Check] Nenhum dado encontrado, retornando status padrão")

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: 1,
        status_name: "Aguardando Pagamento",
        amount: 0,
        is_paid: false,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        payment_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      source: "default",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [SuperPayBR Check] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
