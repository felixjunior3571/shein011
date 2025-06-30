import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Cache em memória (mesmo do webhook)
const paymentCache = new Map<string, any>()

// Função para buscar no cache
function getFromCache(identifier: string): any | null {
  // Buscar por external_id
  let cached = paymentCache.get(identifier)
  if (cached) return cached

  // Buscar por invoice_id
  cached = paymentCache.get(identifier)
  if (cached) return cached

  // Buscar por token
  cached = paymentCache.get(`token_${identifier}`)
  if (cached) return cached

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    const identifier = externalId || invoiceId || token

    console.log("🔍 Consultando status SuperPay (HÍBRIDO):", {
      externalId,
      invoiceId,
      token,
      identifier,
    })

    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório: externalId, invoiceId ou token",
        },
        { status: 400 },
      )
    }

    // 1. TENTAR BUSCAR NO CACHE PRIMEIRO (Rápido)
    const cachedData = getFromCache(identifier)

    if (cachedData) {
      console.log("⚡ Pagamento SuperPay encontrado no CACHE:", {
        external_id: cachedData.externalId,
        is_paid: cachedData.isPaid,
        status: cachedData.statusName,
        source: "cache",
      })

      return NextResponse.json({
        success: true,
        found: true,
        data: {
          isPaid: cachedData.isPaid || false,
          isDenied: cachedData.isDenied || false,
          isExpired: cachedData.isExpired || false,
          isCanceled: cachedData.isCanceled || false,
          isRefunded: cachedData.isRefunded || false,
          statusCode: cachedData.statusCode,
          statusName: cachedData.statusName,
          amount: cachedData.amount || 0,
          paymentDate: cachedData.paymentDate,
          lastUpdate: cachedData.receivedAt,
          externalId: cachedData.externalId,
          invoiceId: cachedData.invoiceId,
          payId: cachedData.payId,
          source: "cache_hit",
        },
      })
    }

    // 2. BUSCAR NO SUPABASE (Backup/Persistente)
    console.log("🔍 Buscando no Supabase...")

    let query = supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })

    // Add search conditions
    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    } else if (token) {
      query = query.or(`external_id.eq.${token},invoice_id.eq.${token}`)
    }

    const { data: records, error } = await query.limit(1)

    if (error) {
      console.error("❌ Erro na consulta Supabase:", error)
      throw error
    }

    const record = records?.[0]

    if (!record) {
      console.log("❌ Pagamento SuperPay não encontrado (Cache + Supabase)")
      return NextResponse.json({
        success: true,
        found: false,
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: null,
          statusName: "Não encontrado",
          amount: 0,
          paymentDate: null,
          lastUpdate: new Date().toISOString(),
          source: "not_found",
        },
      })
    }

    console.log("✅ Pagamento SuperPay encontrado no SUPABASE:", {
      id: record.id,
      external_id: record.external_id,
      status: record.status_name,
      is_paid: record.is_paid,
    })

    // 3. REPOVOAR CACHE com dados do Supabase
    const cacheData = {
      externalId: record.external_id,
      invoiceId: record.invoice_id,
      token: record.token,
      isPaid: record.is_paid || false,
      isDenied: record.is_denied || false,
      isExpired: record.is_expired || false,
      isCanceled: record.is_canceled || false,
      isRefunded: record.is_refunded || false,
      amount: record.amount || 0,
      paymentDate: record.payment_date,
      payId: record.pay_id,
      statusCode: record.status_code,
      statusName: record.status_name,
      statusDescription: record.status_description || "",
      receivedAt: record.processed_at,
      rawData: record.webhook_data,
      source: "supabase_restored",
    }

    // Salvar no cache para próximas consultas
    paymentCache.set(record.external_id, cacheData)
    if (record.invoice_id) {
      paymentCache.set(record.invoice_id, cacheData)
    }
    if (record.token) {
      paymentCache.set(`token_${record.token}`, cacheData)
    }

    console.log("🔄 Cache repovoado com dados do Supabase")

    // Return standardized response
    const response = {
      success: true,
      found: true,
      data: {
        isPaid: record.is_paid || false,
        isDenied: record.is_denied || false,
        isExpired: record.is_expired || false,
        isCanceled: record.is_canceled || false,
        isRefunded: record.is_refunded || false,
        statusCode: record.status_code,
        statusName: record.status_name,
        amount: record.amount || 0,
        paymentDate: record.payment_date,
        lastUpdate: record.processed_at,
        externalId: record.external_id,
        invoiceId: record.invoice_id,
        payId: record.pay_id,
        webhookData: record.webhook_data,
        source: "supabase_hit",
      },
    }

    console.log("📤 Resposta da consulta SuperPay:", {
      external_id: response.data.externalId,
      is_paid: response.data.isPaid,
      status: response.data.statusName,
      source: response.data.source,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro na API de status SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { externalIds } = body

    if (!Array.isArray(externalIds) || externalIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Array de externalIds é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consulta em lote SuperPay (HÍBRIDO):", externalIds)

    // 1. Verificar cache primeiro
    const cacheResults: any[] = []
    const notInCache: string[] = []

    for (const externalId of externalIds) {
      const cached = getFromCache(externalId)
      if (cached) {
        cacheResults.push({
          externalId: cached.externalId,
          found: true,
          isPaid: cached.isPaid,
          isDenied: cached.isDenied,
          isExpired: cached.isExpired,
          isCanceled: cached.isCanceled,
          isRefunded: cached.isRefunded,
          statusCode: cached.statusCode,
          statusName: cached.statusName,
          amount: cached.amount,
          paymentDate: cached.paymentDate,
          lastUpdate: cached.receivedAt,
          invoiceId: cached.invoiceId,
          payId: cached.payId,
          source: "cache_hit",
        })
      } else {
        notInCache.push(externalId)
      }
    }

    console.log(`⚡ Cache: ${cacheResults.length}/${externalIds.length} encontrados`)

    // 2. Buscar restantes no Supabase
    let supabaseResults: any[] = []

    if (notInCache.length > 0) {
      const { data: records, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpay")
        .in("external_id", notInCache)
        .order("processed_at", { ascending: false })

      if (error) {
        console.error("❌ Erro na consulta em lote Supabase:", error)
        throw error
      }

      // Map Supabase results
      supabaseResults = notInCache.map((externalId) => {
        const record = records?.find((r) => r.external_id === externalId)

        if (!record) {
          return {
            externalId,
            found: false,
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
            statusCode: null,
            statusName: "Não encontrado",
            amount: 0,
            paymentDate: null,
            lastUpdate: new Date().toISOString(),
            source: "not_found",
          }
        }

        // Repovoar cache
        const cacheData = {
          externalId: record.external_id,
          invoiceId: record.invoice_id,
          token: record.token,
          isPaid: record.is_paid || false,
          isDenied: record.is_denied || false,
          isExpired: record.is_expired || false,
          isCanceled: record.is_canceled || false,
          isRefunded: record.is_refunded || false,
          amount: record.amount || 0,
          paymentDate: record.payment_date,
          payId: record.pay_id,
          statusCode: record.status_code,
          statusName: record.status_name,
          receivedAt: record.processed_at,
          rawData: record.webhook_data,
          source: "supabase_restored",
        }

        paymentCache.set(record.external_id, cacheData)

        return {
          externalId: record.external_id,
          found: true,
          isPaid: record.is_paid || false,
          isDenied: record.is_denied || false,
          isExpired: record.is_expired || false,
          isCanceled: record.is_canceled || false,
          isRefunded: record.is_refunded || false,
          statusCode: record.status_code,
          statusName: record.status_name,
          amount: record.amount || 0,
          paymentDate: record.payment_date,
          lastUpdate: record.processed_at,
          invoiceId: record.invoice_id,
          payId: record.pay_id,
          source: "supabase_hit",
        }
      })

      console.log(`🗄️ Supabase: ${supabaseResults.filter((r) => r.found).length}/${notInCache.length} encontrados`)
    }

    // 3. Combinar resultados
    const allResults = [...cacheResults, ...supabaseResults]

    console.log(
      `✅ Consulta em lote SuperPay concluída: ${allResults.filter((r) => r.found).length}/${externalIds.length} encontrados`,
    )

    return NextResponse.json({
      success: true,
      data: allResults,
      summary: {
        total: externalIds.length,
        found: allResults.filter((r) => r.found).length,
        paid: allResults.filter((r) => r.isPaid).length,
        cache_hits: cacheResults.length,
        supabase_hits: supabaseResults.filter((r) => r.found).length,
        storage: "hybrid_supabase_cache",
      },
    })
  } catch (error) {
    console.error("❌ Erro na consulta em lote SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
