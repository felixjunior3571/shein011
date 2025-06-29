import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Cache para evitar consultas excessivas
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos

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

    console.log("🔍 === CONSULTANDO PAGAMENTO SUPERPAYBR ===")
    console.log("🆔 External ID:", externalId)

    // Verificar cache primeiro
    const cacheKey = `payment_${externalId}`
    const cached = cache.get(cacheKey)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log("⚡ Retornando dados do cache")
      return NextResponse.json({
        success: true,
        data: cached.data,
        source: "cache",
        cached_at: new Date(cached.timestamp).toISOString(),
      })
    }

    // Consultar Supabase primeiro (dados do webhook)
    console.log("💾 Consultando Supabase...")
    const { data: supabaseData, error: supabaseError } = await supabase
      .from("payments")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (!supabaseError && supabaseData) {
      console.log("✅ Dados encontrados no Supabase:", {
        status: supabaseData.status,
        is_paid: supabaseData.is_paid,
        amount: supabaseData.amount,
      })

      const responseData = {
        external_id: externalId,
        status: supabaseData.status,
        is_paid: supabaseData.is_paid,
        is_denied: supabaseData.is_denied,
        is_expired: supabaseData.is_expired,
        is_canceled: supabaseData.is_canceled,
        is_refunded: supabaseData.is_refunded,
        amount: supabaseData.amount,
        payment_date: supabaseData.payment_date,
        updated_at: supabaseData.updated_at,
      }

      // Atualizar cache
      cache.set(cacheKey, { data: responseData, timestamp: now })

      return NextResponse.json({
        success: true,
        data: responseData,
        source: "supabase",
      })
    }

    console.log("⚠️ Dados não encontrados no Supabase, consultando API...")

    // Se não encontrou no Supabase, consultar API SuperPayBR com Basic Auth
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

    // Fazer autenticação Basic Auth primeiro
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    let accessToken = null

    try {
      const authResponse = await fetch(`${apiUrl}/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${base64Credentials}`,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
        }),
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        accessToken = authData.access_token || authData.token
      }
    } catch (error) {
      console.log("❌ Erro na autenticação para consulta:", error)
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível obter access token para consulta",
        },
        { status: 401 },
      )
    }

    // Tentar múltiplas URLs de consulta com Bearer token
    const checkUrls = [
      `${apiUrl}/invoices/${externalId}`,
      `${apiUrl}/payment/${externalId}`,
      `${apiUrl}/status/${externalId}`,
    ]

    let checkSuccess = false
    let apiData = null

    for (const checkUrl of checkUrls) {
      try {
        console.log(`🔄 Consultando: ${checkUrl}`)

        const checkResponse = await fetch(checkUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (checkResponse.ok) {
          apiData = await checkResponse.json()
          console.log("✅ Dados obtidos da API SuperPayBR")
          checkSuccess = true
          break
        }
      } catch (error) {
        console.log(`❌ Erro em ${checkUrl}:`, error)
      }
    }

    if (!checkSuccess || !apiData) {
      console.log("❌ Não foi possível obter dados da API")
      return NextResponse.json(
        {
          success: false,
          error: "Pagamento não encontrado",
          external_id: externalId,
        },
        { status: 404 },
      )
    }

    // Processar dados da API
    const status = apiData.status || apiData.payment_status || 0
    const amount = apiData.amount || apiData.value || 0

    let isPaid = false
    let statusName = "Pendente"

    if (typeof status === "number" && status === 5) {
      isPaid = true
      statusName = "Pagamento Confirmado!"
    } else if (typeof status === "string" && status.toLowerCase().includes("paid")) {
      isPaid = true
      statusName = "Pagamento Confirmado!"
    }

    const responseData = {
      external_id: externalId,
      status: statusName,
      is_paid: isPaid,
      is_denied: false,
      is_expired: false,
      is_canceled: false,
      is_refunded: false,
      amount: typeof amount === "number" ? amount : Number.parseFloat(amount?.toString() || "0"),
      payment_date: isPaid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    // Atualizar cache
    cache.set(cacheKey, { data: responseData, timestamp: now })

    console.log("✅ Consulta concluída:", {
      status: statusName,
      is_paid: isPaid,
      amount: responseData.amount,
    })

    return NextResponse.json({
      success: true,
      data: responseData,
      source: "api",
    })
  } catch (error) {
    console.error("❌ Erro ao consultar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
