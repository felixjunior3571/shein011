import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Pool de conexões Supabase
const supabasePool = Array.from({ length: 3 }, () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
)
let poolIndex = 0

function getSupabaseClient() {
  const client = supabasePool[poolIndex]
  poolIndex = (poolIndex + 1) % supabasePool.length
  return client
}

// Cache local para consultas frequentes
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5000 // 5 segundos

// Importar cache do webhook
let paymentCache: any
try {
  const webhookModule = await import("./webhook/route")
  paymentCache = webhookModule.paymentCache
} catch {
  // Fallback se não conseguir importar
  paymentCache = new Map()
}

function getCachedQuery(key: string) {
  const cached = queryCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }
  return null
}

function setCachedQuery(key: string, data: any) {
  queryCache.set(key, { data, timestamp: Date.now() })

  // Limpar cache antigo
  if (queryCache.size > 1000) {
    const oldestKey = queryCache.keys().next().value
    queryCache.delete(oldestKey)
  }
}

function getPaymentConfirmation(identifier: string) {
  // Buscar no cache do webhook primeiro
  if (paymentCache && typeof paymentCache.get === "function") {
    let confirmation = paymentCache.get(identifier)
    if (confirmation) return confirmation

    confirmation = paymentCache.get(`token_${identifier}`)
    if (confirmation) return confirmation
  }

  return null
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")
    const action = searchParams.get("action")

    // Ações especiais otimizadas
    if (action === "batch") {
      const ids = searchParams.get("ids")?.split(",") || []
      if (ids.length === 0) {
        return NextResponse.json({ success: false, error: "No IDs provided" }, { status: 400 })
      }

      const results = await Promise.all(
        ids.slice(0, 50).map(async (id) => {
          // Limitar a 50 consultas simultâneas
          const cached = getCachedQuery(`batch_${id}`)
          if (cached) return { id, ...cached }

          const confirmation = getPaymentConfirmation(id)
          if (confirmation) {
            const result = { id, found: true, data: confirmation }
            setCachedQuery(`batch_${id}`, result)
            return result
          }

          return { id, found: false }
        }),
      )

      return NextResponse.json({
        success: true,
        results,
        processing_time_ms: Date.now() - startTime,
      })
    }

    if (action === "all") {
      const cacheKey = "all_confirmations"
      const cached = getCachedQuery(cacheKey)
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          source: "cache",
          processing_time_ms: Date.now() - startTime,
        })
      }

      try {
        const client = getSupabaseClient()
        const { data: webhooks, error } = await client
          .from("payment_webhooks")
          .select("*")
          .eq("gateway", "superpay")
          .order("received_at", { ascending: false })
          .limit(100) // Limitar para performance

        if (error) {
          console.log("⚠️ Erro ao buscar webhooks no Supabase:", error.message)
          return NextResponse.json({
            success: true,
            data: [],
            source: "error_fallback",
            processing_time_ms: Date.now() - startTime,
          })
        }

        setCachedQuery(cacheKey, webhooks || [])

        return NextResponse.json({
          success: true,
          data: webhooks || [],
          source: "supabase",
          processing_time_ms: Date.now() - startTime,
        })
      } catch (dbError) {
        console.log("❌ Erro de conexão com Supabase:", dbError)
        return NextResponse.json({
          success: true,
          data: [],
          source: "connection_error",
          processing_time_ms: Date.now() - startTime,
        })
      }
    }

    // Consulta individual otimizada
    const identifier = externalId || invoiceId || token
    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "External ID, Invoice ID ou Token obrigatório" },
        { status: 400 },
      )
    }

    // Verificar cache de consulta primeiro
    const cacheKey = `query_${identifier}`
    const cached = getCachedQuery(cacheKey)
    if (cached) {
      return NextResponse.json({
        ...cached,
        source: "cache",
        processing_time_ms: Date.now() - startTime,
      })
    }

    console.log(`🔍 [${identifier}] Verificando status SuperPay`)

    // Buscar na memória global primeiro (mais rápido)
    let confirmation = getPaymentConfirmation(identifier)

    if (confirmation) {
      console.log(`⚡ [${identifier}] Encontrado na memória`)
      const result = {
        success: true,
        found: true,
        data: {
          externalId: confirmation.externalId,
          invoiceId: confirmation.invoiceId,
          token: confirmation.token,
          isPaid: confirmation.isPaid,
          isDenied: confirmation.isDenied,
          isRefunded: confirmation.isRefunded,
          isExpired: confirmation.isExpired,
          isCanceled: confirmation.isCanceled,
          amount: confirmation.amount,
          paymentDate: confirmation.paymentDate,
          statusCode: confirmation.statusCode,
          statusName: confirmation.statusName,
          receivedAt: confirmation.receivedAt,
        },
        source: "memory",
      }

      setCachedQuery(cacheKey, result)
      return NextResponse.json({
        ...result,
        processing_time_ms: Date.now() - startTime,
      })
    }

    // Buscar no Supabase como fallback
    try {
      console.log(`🔍 [${identifier}] Buscando no Supabase...`)

      const client = getSupabaseClient()
      let query = client.from("payment_webhooks").select("*").eq("gateway", "superpay")

      if (externalId) {
        query = query.eq("external_id", externalId)
      } else if (invoiceId) {
        query = query.eq("invoice_id", invoiceId)
      } else if (token) {
        query = query.eq("token", token)
      }

      const { data: webhookData, error } = await query.single()

      if (error && error.code !== "PGRST116") {
        console.log(`⚠️ [${identifier}] Erro Supabase:`, error.message)
      }

      if (webhookData) {
        confirmation = {
          externalId: webhookData.external_id,
          invoiceId: webhookData.invoice_id,
          token: webhookData.token,
          isPaid: webhookData.is_paid,
          isDenied: webhookData.is_denied,
          isRefunded: webhookData.is_refunded,
          isExpired: webhookData.is_expired,
          isCanceled: webhookData.is_canceled,
          amount: webhookData.amount,
          paymentDate: webhookData.payment_date,
          statusCode: webhookData.status_code,
          statusName: webhookData.status_description,
          receivedAt: webhookData.received_at,
        }

        console.log(`✅ [${identifier}] Encontrado no Supabase`)

        const result = {
          success: true,
          found: true,
          data: confirmation,
          source: "supabase",
        }

        setCachedQuery(cacheKey, result)
        return NextResponse.json({
          ...result,
          processing_time_ms: Date.now() - startTime,
        })
      }
    } catch (dbError) {
      console.log(`❌ [${identifier}] Erro conexão Supabase:`, dbError)
    }

    // Não encontrado
    console.log(`⏳ [${identifier}] Nenhuma confirmação encontrada`)

    const result = {
      success: true,
      found: false,
      message: "No webhook data found yet",
      source: "not_found",
    }

    setCachedQuery(cacheKey, result)
    return NextResponse.json({
      ...result,
      processing_time_ms: Date.now() - startTime,
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ Erro na verificação SuperPay (${processingTime}ms):`, error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        processing_time_ms: processingTime,
      },
      { status: 500 },
    )
  }
}
