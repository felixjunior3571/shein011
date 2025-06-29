import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ⚠️ CACHE em memória para evitar múltiplas consultas ao Supabase
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 10000 // 10 segundos
const requestCount = new Map<string, { count: number; resetTime: number }>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    // ⚠️ RATE LIMITING por IP
    const now = Date.now()
    const ipKey = `${clientIP}_${externalId}`
    const ipData = requestCount.get(ipKey)

    if (ipData) {
      if (now < ipData.resetTime) {
        if (ipData.count >= 10) {
          console.log(`🚫 Rate limit atingido para IP ${clientIP}`)
          return NextResponse.json(
            {
              success: false,
              error: "Muitas requisições. Tente novamente em alguns segundos.",
            },
            { status: 429 },
          )
        }
        ipData.count++
      } else {
        // Reset contador
        ipData.count = 1
        ipData.resetTime = now + 60000 // 1 minuto
      }
    } else {
      requestCount.set(ipKey, { count: 1, resetTime: now + 60000 })
    }

    // ⚠️ VERIFICAR CACHE primeiro
    const cached = cache.get(externalId)
    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log("📦 Retornando do cache SuperPayBR:", externalId)
      return NextResponse.json(cached.data)
    }

    console.log("🔍 Verificando pagamento SuperPayBR no Supabase:", externalId)

    // ⚠️ BUSCAR APENAS no Supabase (sem consultar API para evitar rate limit)
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
      return NextResponse.json({ success: false, error: "Erro ao verificar pagamento" }, { status: 500 })
    }

    let responseData

    if (!data) {
      console.log("ℹ️ Pagamento SuperPayBR não encontrado:", externalId)
      responseData = {
        success: true,
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
        statusCode: 1,
        statusName: "pending",
        amount: 0,
        paymentDate: null,
        message: "Pagamento não encontrado - aguardando webhook",
      }
    } else {
      const paymentData = data.payment_data
      console.log("✅ Pagamento SuperPayBR encontrado:", {
        isPaid: paymentData.isPaid,
        statusCode: paymentData.statusCode,
        statusName: paymentData.statusName,
      })

      responseData = {
        success: true,
        isPaid: paymentData.isPaid,
        isDenied: paymentData.isDenied,
        isExpired: paymentData.isExpired,
        isCanceled: paymentData.isCanceled,
        isRefunded: paymentData.isRefunded,
        statusCode: paymentData.statusCode,
        statusName: paymentData.statusName,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        message: paymentData.isPaid ? "Pagamento confirmado!" : "Aguardando pagamento",
        last_updated: data.updated_at,
      }
    }

    // ⚠️ SALVAR no cache
    cache.set(externalId, {
      data: responseData,
      timestamp: now,
    })

    // ⚠️ LIMPAR cache antigo (manter apenas últimos 50 itens)
    if (cache.size > 50) {
      const oldestKey = cache.keys().next().value
      cache.delete(oldestKey)
    }

    // ⚠️ LIMPAR rate limiting antigo
    if (requestCount.size > 100) {
      for (const [key, data] of requestCount.entries()) {
        if (now > data.resetTime) {
          requestCount.delete(key)
        }
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao verificar pagamento SuperPayBR",
      },
      { status: 500 },
    )
  }
}
