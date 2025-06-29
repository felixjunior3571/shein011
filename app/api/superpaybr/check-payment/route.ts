import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get("payment_id")

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "payment_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Verificando pagamento: ${paymentId}`)

    // Buscar no Supabase primeiro (cache)
    const { data: cachedPayment, error: cacheError } = await supabase
      .from("payments")
      .select("*")
      .eq("payment_id", paymentId)
      .single()

    if (!cacheError && cachedPayment) {
      const cacheAge = Date.now() - new Date(cachedPayment.updated_at).getTime()

      // Se o cache tem menos de 30 segundos, usar ele
      if (cacheAge < 30000) {
        console.log("✅ Usando dados do cache (< 30s)")
        return NextResponse.json({
          success: true,
          data: {
            id: cachedPayment.payment_id,
            status: cachedPayment.status,
            amount: cachedPayment.amount,
            provider: cachedPayment.provider,
            cached: true,
            cache_age: Math.round(cacheAge / 1000),
          },
        })
      }
    }

    // Consultar API SuperPayBR
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

    const checkUrls = [
      `${apiUrl}/invoices/${paymentId}`,
      `${apiUrl}/payment/${paymentId}`,
      `${apiUrl}/status/${paymentId}`,
    ]

    let checkSuccess = false
    let responseData = null

    for (const checkUrl of checkUrls) {
      try {
        const checkResponse = await fetch(checkUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (checkResponse.ok) {
          responseData = await checkResponse.json()
          checkSuccess = true
          break
        }
      } catch (error) {
        console.log(`❌ Erro em ${checkUrl}:`, error)
      }
    }

    if (!checkSuccess) {
      // Retornar dados do cache mesmo se antigos
      if (cachedPayment) {
        console.log("⚠️ API falhou, usando cache antigo")
        return NextResponse.json({
          success: true,
          data: {
            id: cachedPayment.payment_id,
            status: cachedPayment.status,
            amount: cachedPayment.amount,
            provider: cachedPayment.provider,
            cached: true,
            fallback: true,
          },
        })
      }

      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível verificar o status do pagamento",
        },
        { status: 500 },
      )
    }

    // Extrair status da resposta
    const status = responseData.status || responseData.payment_status || "pending"
    const amount = responseData.amount || responseData.value || 0

    // Atualizar cache no Supabase
    await supabase.from("payments").upsert(
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

    console.log(`✅ Status do pagamento ${paymentId}: ${status}`)

    return NextResponse.json({
      success: true,
      data: {
        id: paymentId,
        status: status,
        amount: amount,
        provider: "superpaybr",
        cached: false,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento:", error)
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
