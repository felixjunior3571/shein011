import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória (mesmo do webhook)
const globalPaymentStorage = new Map<string, any>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({
        success: false,
        error: "external_id é obrigatório",
      })
    }

    console.log(`🔍 Consultando status para: ${externalId}`)

    // 1. Verificar cache em memória primeiro
    const cachedData = globalPaymentStorage.get(externalId)
    if (cachedData) {
      console.log("⚡ Dados encontrados no cache:", cachedData)

      return NextResponse.json({
        success: true,
        isPaid: cachedData.is_paid || false,
        isDenied: cachedData.is_denied || false,
        isRefunded: cachedData.is_refunded || false,
        isExpired: cachedData.is_expired || false,
        isCanceled: cachedData.is_canceled || false,
        statusCode: cachedData.status_code || 1,
        statusName: cachedData.status_name || "pending",
        amount: cachedData.amount || 0,
        paymentDate: cachedData.payment_date,
        timestamp: cachedData.timestamp,
        source: "cache",
      })
    }

    // 2. Consultar Supabase como backup
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data: supabaseData, error } = await supabase
        .from("superpaybr_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .order("processed_at", { ascending: false })
        .limit(1)
        .single()

      if (supabaseData && !error) {
        console.log("💾 Dados encontrados no Supabase:", supabaseData)

        // Atualizar cache
        const paymentData = {
          external_id: supabaseData.external_id,
          status_code: supabaseData.status_code,
          status_name: supabaseData.status_name,
          amount: supabaseData.amount,
          payment_date: supabaseData.payment_date,
          is_paid: supabaseData.status_code === 5,
          is_denied: supabaseData.status_code === 3,
          is_expired: supabaseData.status_code === 4,
          is_canceled: supabaseData.status_code === 6,
          is_refunded: supabaseData.status_code === 7,
          timestamp: supabaseData.processed_at,
        }

        globalPaymentStorage.set(externalId, paymentData)

        return NextResponse.json({
          success: true,
          isPaid: paymentData.is_paid,
          isDenied: paymentData.is_denied,
          isRefunded: paymentData.is_refunded,
          isExpired: paymentData.is_expired,
          isCanceled: paymentData.is_canceled,
          statusCode: paymentData.status_code,
          statusName: paymentData.status_name,
          amount: paymentData.amount,
          paymentDate: paymentData.payment_date,
          timestamp: paymentData.timestamp,
          source: "supabase",
        })
      }
    } catch (supabaseError) {
      console.error("⚠️ Erro ao consultar Supabase:", supabaseError)
    }

    // 3. Consultar API SuperPayBR diretamente (rate limited)
    try {
      const apiUrl = process.env.SUPERPAY_API_URL
      const token = process.env.SUPERPAY_TOKEN
      const secretKey = process.env.SUPERPAY_SECRET_KEY

      if (apiUrl && token && secretKey) {
        console.log("🌐 Consultando API SuperPayBR...")

        const checkEndpoints = [
          `${apiUrl}/invoices/${externalId}`,
          `${apiUrl}/invoice/status/${externalId}`,
          `${apiUrl}/payment/status/${externalId}`,
          `${apiUrl}/api/invoices/${externalId}`,
        ]

        for (const endpoint of checkEndpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "X-API-Key": secretKey,
              },
            })

            if (response.ok) {
              const data = await response.json()
              console.log("✅ Status obtido da API:", data)

              const paymentData = {
                external_id: externalId,
                status_code: data.status?.code || 1,
                status_name: mapStatusCode(data.status?.code || 1),
                amount: data.amount || 0,
                payment_date: data.payment_date,
                is_paid: data.status?.code === 5,
                is_denied: data.status?.code === 3,
                is_expired: data.status?.code === 4,
                is_canceled: data.status?.code === 6,
                is_refunded: data.status?.code === 7,
                timestamp: new Date().toISOString(),
              }

              // Atualizar cache
              globalPaymentStorage.set(externalId, paymentData)

              return NextResponse.json({
                success: true,
                isPaid: paymentData.is_paid,
                isDenied: paymentData.is_denied,
                isRefunded: paymentData.is_refunded,
                isExpired: paymentData.is_expired,
                isCanceled: paymentData.is_canceled,
                statusCode: paymentData.status_code,
                statusName: paymentData.status_name,
                amount: paymentData.amount,
                paymentDate: paymentData.payment_date,
                timestamp: paymentData.timestamp,
                source: "api",
              })
            }
          } catch (err) {
            console.log(`❌ Erro no endpoint ${endpoint}:`, err)
            continue
          }
        }
      }
    } catch (apiError) {
      console.error("⚠️ Erro ao consultar API:", apiError)
    }

    // 4. Retornar status padrão se nada foi encontrado
    console.log("📋 Retornando status padrão (pending)")

    return NextResponse.json({
      success: true,
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 1,
      statusName: "pending",
      amount: 0,
      paymentDate: null,
      timestamp: new Date().toISOString(),
      source: "default",
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status:", error)

    return NextResponse.json({
      success: false,
      error: "Erro interno ao consultar status",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

function mapStatusCode(code: number): string {
  const statusMap: { [key: number]: string } = {
    1: "pending",
    2: "processing",
    3: "denied",
    4: "expired",
    5: "approved",
    6: "canceled",
    7: "refunded",
    8: "chargeback",
  }

  return statusMap[code] || "unknown"
}
