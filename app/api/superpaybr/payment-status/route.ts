import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { globalPaymentStorage } from "../webhook/route"

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

    console.log(`🔍 Consultando status SuperPayBR: ${externalId}`)

    // 1. Consultar armazenamento global primeiro (sem rate limit)
    const cachedData = globalPaymentStorage.get(externalId)

    if (cachedData) {
      console.log("✅ Dados encontrados no armazenamento global")
      return NextResponse.json({
        success: true,
        data: cachedData,
        isPaid: cachedData.is_paid,
        isDenied: cachedData.is_denied,
        isExpired: cachedData.is_expired,
        isCanceled: cachedData.is_canceled,
        isRefunded: cachedData.is_refunded,
        statusCode: cachedData.status.code,
        statusName: cachedData.status.text,
        amount: cachedData.amount,
        paymentDate: cachedData.payment_date,
        timestamp: cachedData.webhook_received_at,
        source: "memory",
      })
    }

    // 2. Consultar Supabase como fallback
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data: supabaseData, error } = await supabase
        .from("superpaybr_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (!error && supabaseData) {
        console.log("✅ Dados encontrados no Supabase")

        const responseData = {
          external_id: supabaseData.external_id,
          invoice_id: supabaseData.invoice_id,
          status: {
            code: supabaseData.status_code,
            text: supabaseData.status_name,
            title: supabaseData.status_title,
          },
          amount: supabaseData.amount,
          payment_date: supabaseData.payment_date,
          is_paid: supabaseData.is_paid,
          is_denied: supabaseData.is_denied,
          is_expired: supabaseData.is_expired,
          is_canceled: supabaseData.is_canceled,
          is_refunded: supabaseData.is_refunded,
          webhook_received_at: supabaseData.created_at,
        }

        // Salvar no cache para próximas consultas
        globalPaymentStorage.set(externalId, responseData)

        return NextResponse.json({
          success: true,
          data: responseData,
          isPaid: responseData.is_paid,
          isDenied: responseData.is_denied,
          isExpired: responseData.is_expired,
          isCanceled: responseData.is_canceled,
          isRefunded: responseData.is_refunded,
          statusCode: responseData.status.code,
          statusName: responseData.status.text,
          amount: responseData.amount,
          paymentDate: responseData.payment_date,
          timestamp: responseData.webhook_received_at,
          source: "supabase",
        })
      }
    } catch (supabaseError) {
      console.error("⚠️ Erro ao consultar Supabase:", supabaseError)
    }

    // 3. Status padrão quando não encontrado
    console.log("⚠️ Pagamento não encontrado, retornando status padrão")

    const defaultData = {
      external_id: externalId,
      invoice_id: externalId,
      status: {
        code: 1,
        text: "pending",
        title: "Aguardando Pagamento",
      },
      amount: 0,
      payment_date: null,
      is_paid: false,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      is_refunded: false,
      webhook_received_at: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: defaultData,
      isPaid: false,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
      statusCode: 1,
      statusName: "pending",
      amount: 0,
      paymentDate: null,
      timestamp: new Date().toISOString(),
      source: "default",
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
