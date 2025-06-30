import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Cache em memória (mesmo do webhook)
const paymentCache = new Map<string, any>()

// Rate limiting simples para evitar abuso
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests por minuto por IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const clientData = rateLimitMap.get(ip)

  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  clientData.count++
  return true
}

// Função para buscar no cache
function getFromCache(identifier: string): any | null {
  // Buscar por external_id
  let cached = paymentCache.get(identifier)
  if (cached) return cached

  // Buscar por token
  cached = paymentCache.get(`token_${identifier}`)
  if (cached) return cached

  return null
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    if (!checkRateLimit(ip)) {
      console.log(`🚫 Rate limit excedido para IP: ${ip}`)
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit excedido. Tente novamente em 1 minuto.",
          retryAfter: 60,
        },
        { status: 429 },
      )
    }

    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    const identifier = externalId || invoiceId || token

    console.log("🔍 Consultando status SuperPay (SEM POLLING):", {
      externalId,
      invoiceId,
      token,
      identifier,
      ip,
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

    // 1. VERIFICAR CACHE PRIMEIRO (Instantâneo)
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

    // 2. VERIFICAR NOTIFICAÇÕES RECENTES (Tempo Real)
    console.log("📡 Verificando notificações recentes...")

    const { data: notifications, error: notificationError } = await supabase
      .from("webhook_notifications")
      .select("*")
      .eq("external_id", identifier)
      .eq("notification_type", "payment_status_change")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)

    if (!notificationError && notifications && notifications.length > 0) {
      const notification = notifications[0]
      const notificationData = notification.notification_data

      console.log("📡 Notificação encontrada:", {
        external_id: notificationData.externalId,
        is_paid: notificationData.isPaid,
        status: notificationData.statusName,
        source: "notification",
      })

      // Salvar no cache para próximas consultas
      const cacheData = {
        externalId: notificationData.externalId,
        invoiceId: notificationData.invoiceId,
        token: notificationData.token,
        isPaid: notificationData.isPaid || false,
        isDenied: notificationData.isDenied || false,
        isExpired: notificationData.isExpired || false,
        isCanceled: notificationData.isCanceled || false,
        isRefunded: notificationData.isRefunded || false,
        amount: notificationData.amount || 0,
        paymentDate: notificationData.paymentDate,
        payId: notificationData.payId,
        statusCode: notificationData.statusCode,
        statusName: notificationData.statusName,
        receivedAt: notificationData.receivedAt,
        source: "notification_cached",
      }

      paymentCache.set(notificationData.externalId, cacheData)
      if (notificationData.invoiceId) {
        paymentCache.set(notificationData.invoiceId, cacheData)
      }

      return NextResponse.json({
        success: true,
        found: true,
        data: {
          isPaid: notificationData.isPaid || false,
          isDenied: notificationData.isDenied || false,
          isExpired: notificationData.isExpired || false,
          isCanceled: notificationData.isCanceled || false,
          isRefunded: notificationData.isRefunded || false,
          statusCode: notificationData.statusCode,
          statusName: notificationData.statusName,
          amount: notificationData.amount || 0,
          paymentDate: notificationData.paymentDate,
          lastUpdate: notificationData.receivedAt,
          externalId: notificationData.externalId,
          invoiceId: notificationData.invoiceId,
          payId: notificationData.payId,
          source: "notification_hit",
        },
      })
    }

    // 3. BUSCAR NO SUPABASE APENAS SE NECESSÁRIO (Última opção)
    console.log("🗄️ Buscando no Supabase (última opção)...")

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
      console.log("❌ Pagamento SuperPay não encontrado em nenhuma fonte")
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

    // Repovoar cache com dados do Supabase
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

    // Salvar no cache para próximas consultas
    paymentCache.set(record.external_id, cacheData)
    if (record.invoice_id) {
      paymentCache.set(record.invoice_id, cacheData)
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
