import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("id")

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "ID do pagamento é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Consultando status do pagamento: ${paymentId}`)

    // Buscar no Supabase primeiro
    const { data: payment, error } = await supabase.from("payments").select("*").eq("payment_id", paymentId).single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao consultar Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
        },
        { status: 500 },
      )
    }

    if (payment) {
      const cacheAge = Date.now() - new Date(payment.updated_at).getTime()

      console.log(`📊 Pagamento encontrado no cache (${Math.round(cacheAge / 1000)}s atrás)`)

      return NextResponse.json({
        success: true,
        data: {
          id: payment.payment_id,
          status: payment.status,
          amount: payment.amount,
          provider: payment.provider,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          cache_age_seconds: Math.round(cacheAge / 1000),
        },
      })
    }

    // Se não encontrou no cache, consultar API
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    console.log("🔄 Consultando API SuperPayBR...")

    const statusUrls = [
      `${apiUrl}/invoices/${paymentId}`,
      `${apiUrl}/payment/${paymentId}`,
      `${apiUrl}/status/${paymentId}`,
    ]

    let statusSuccess = false
    let responseData = null

    for (const statusUrl of statusUrls) {
      try {
        const statusResponse = await fetch(statusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (statusResponse.ok) {
          responseData = await statusResponse.json()
          statusSuccess = true
          break
        }
      } catch (error) {
        console.log(`❌ Erro em ${statusUrl}:`, error)
      }
    }

    if (!statusSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível consultar o status na API",
        },
        { status: 500 },
      )
    }

    // Extrair dados da resposta
    const status = responseData.status || responseData.payment_status || "pending"
    const amount = responseData.amount || responseData.value || 0

    // Salvar no cache
    const { data: savedPayment } = await supabase
      .from("payments")
      .upsert(
        {
          payment_id: paymentId,
          status: status,
          amount: amount,
          provider: "superpaybr",
          api_data: responseData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "payment_id",
        },
      )
      .select()
      .single()

    console.log(`✅ Status consultado e salvo: ${status}`)

    return NextResponse.json({
      success: true,
      data: {
        id: paymentId,
        status: status,
        amount: amount,
        provider: "superpaybr",
        created_at: savedPayment?.created_at,
        updated_at: savedPayment?.updated_at,
        cache_age_seconds: 0,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar status",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
