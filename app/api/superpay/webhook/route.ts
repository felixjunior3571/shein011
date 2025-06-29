import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Interface do payload SuperPay
interface SuperPayWebhookPayload {
  event: {
    type: "invoice.update"
    date: string
  }
  invoices: {
    id: string
    external_id: string
    token: string
    date: string
    status: {
      code: number
      title: string
      description: string
    }
    customer: number
    prices: {
      total: number
    }
    type: string
    payment: {
      gateway: string
      payId: string
      payDate: string
      details: {
        pix_code: string
        qrcode: string
        url: string
      }
    }
  }
}

// Armazenamento global otimizado com LRU cache
class OptimizedPaymentCache {
  private cache = new Map<string, any>()
  private accessOrder = new Map<string, number>()
  private maxSize = 10000 // Suporta até 10k pagamentos simultâneos
  private accessCounter = 0

  set(key: string, value: any) {
    // Se cache está cheio, remover o menos usado
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed()
    }

    this.cache.set(key, value)
    this.accessOrder.set(key, ++this.accessCounter)
  }

  get(key: string) {
    const value = this.cache.get(key)
    if (value) {
      this.accessOrder.set(key, ++this.accessCounter)
    }
    return value
  }

  private evictLeastUsed() {
    let leastUsedKey = ""
    let leastUsedAccess = Number.POSITIVE_INFINITY

    for (const [key, access] of this.accessOrder.entries()) {
      if (access < leastUsedAccess) {
        leastUsedAccess = access
        leastUsedKey = key
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
      this.accessOrder.delete(leastUsedKey)
    }
  }

  size() {
    return this.cache.size
  }

  clear() {
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCounter = 0
  }
}

// Cache otimizado para alta concorrência
const paymentCache = new OptimizedPaymentCache()
const realtimeEvents: any[] = []
const maxEvents = 1000 // Manter últimos 1000 eventos

// Pool de conexões Supabase para alta concorrência
const supabasePool = Array.from({ length: 5 }, () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!),
)
let poolIndex = 0

function getSupabaseClient() {
  const client = supabasePool[poolIndex]
  poolIndex = (poolIndex + 1) % supabasePool.length
  return client
}

// Mapeamento completo de status codes SuperPay (1-16)
const STATUS_MAP = {
  1: { name: "pending", title: "Aguardando Pagamento" },
  2: { name: "processing", title: "Em Processamento" },
  3: { name: "scheduled", title: "Pagamento Agendado" },
  4: { name: "authorized", title: "Autorizado" },
  5: { name: "paid", title: "Pago" }, // ✅ CRÍTICO - PAGO
  6: { name: "canceled", title: "Cancelado" }, // 🚫 CRÍTICO - CANCELADO
  7: { name: "refund_pending", title: "Aguardando Estorno" },
  8: { name: "partially_refunded", title: "Parcialmente Estornado" },
  9: { name: "refunded", title: "Estornado" }, // 🔄 CRÍTICO - ESTORNADO
  10: { name: "disputed", title: "Contestado/Em Contestação" },
  11: { name: "chargeback", title: "Chargeback" },
  12: { name: "denied", title: "Pagamento Negado" }, // ❌ CRÍTICO - NEGADO
  13: { name: "blocked", title: "Bloqueado" },
  14: { name: "suspended", title: "Suspenso" },
  15: { name: "expired", title: "Pagamento Vencido" }, // ⏰ CRÍTICO - VENCIDO
  16: { name: "error", title: "Erro no Pagamento" },
} as const

// Função otimizada para salvar confirmações
async function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
  const timestamp = new Date().toISOString()

  const confirmationData = {
    externalId,
    invoiceId,
    token: data.token,
    isPaid: data.statusCode === 5,
    isCanceled: data.statusCode === 6,
    isRefunded: data.statusCode === 9,
    isDenied: data.statusCode === 12,
    isExpired: data.statusCode === 15,
    statusCode: data.statusCode,
    statusName: data.statusName,
    amount: data.amount,
    paymentDate: data.payDate,
    pixCode: data.pixCode,
    qrCodeUrl: data.qrCode,
    receivedAt: timestamp,
    gateway: "superpay",
  }

  // Salvar com múltiplas chaves para facilitar lookup O(1)
  paymentCache.set(externalId, confirmationData)
  paymentCache.set(invoiceId, confirmationData)
  paymentCache.set(`token_${data.token}`, confirmationData)

  // Adicionar aos eventos em tempo real (thread-safe)
  realtimeEvents.unshift({
    ...confirmationData,
    eventType: "webhook_received",
    timestamp,
  })

  // Manter apenas os últimos eventos (evitar memory leak)
  if (realtimeEvents.length > maxEvents) {
    realtimeEvents.splice(maxEvents)
  }

  // Salvar no Supabase de forma assíncrona (não bloquear resposta)
  setImmediate(async () => {
    try {
      const client = getSupabaseClient()
      const supabaseData = {
        external_id: externalId,
        invoice_id: invoiceId,
        token: data.token,
        status_code: data.statusCode,
        status_name: STATUS_MAP[data.statusCode as keyof typeof STATUS_MAP]?.name || "unknown",
        status_description: data.statusName,
        amount: data.amount,
        payment_date: data.payDate || null,
        is_paid: data.statusCode === 5,
        is_denied: data.statusCode === 12,
        is_refunded: data.statusCode === 9,
        is_expired: data.statusCode === 15,
        is_canceled: data.statusCode === 6,
        webhook_data: data.rawPayload || {},
        gateway: "superpay",
        processed_at: timestamp,
        received_at: timestamp,
      }

      const { error } = await client.from("payment_webhooks").upsert(supabaseData, {
        onConflict: "external_id,gateway",
      })

      if (error) {
        console.log(`⚠️ [${externalId}] Erro ao salvar no Supabase:`, error.message)
      } else {
        console.log(`✅ [${externalId}] Salvo no Supabase com sucesso`)
      }
    } catch (dbError) {
      console.log(`❌ [${externalId}] Erro de conexão Supabase:`, dbError)
    }
  })

  return confirmationData
}

// Rate limiting simples por IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 100 // 100 requests por minuto por IP
const RATE_WINDOW = 60000 // 1 minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (limit.count >= RATE_LIMIT) {
    return false
  }

  limit.count++
  return true
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown"

  try {
    // Rate limiting
    if (!checkRateLimit(ip)) {
      console.log(`🚫 Rate limit excedido para IP: ${ip}`)
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    console.log(`🚨 [${ip}] WEBHOOK SUPERPAY RECEBIDO`)

    const body: SuperPayWebhookPayload = await request.json()

    // Validações rápidas (fail-fast)
    if (!body.event || body.event.type !== "invoice.update") {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    if (!body.invoices) {
      return NextResponse.json({ error: "Invoice data missing" }, { status: 400 })
    }

    const invoice = body.invoices

    // Validações essenciais
    if (!invoice.external_id || !invoice.token || !invoice.status?.code) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const statusCode = invoice.status.code
    const external_id = invoice.external_id
    const token = invoice.token
    const preco = invoice.prices?.total || 0

    // Validar status code (1-16)
    if (statusCode < 1 || statusCode > 16) {
      return NextResponse.json({ error: "Invalid status code" }, { status: 400 })
    }

    // Verificar se já foi processado (evitar duplicatas)
    const existing = paymentCache.get(external_id)
    if (existing && existing.statusCode === statusCode) {
      console.log(`⚡ [${external_id}] Webhook duplicado ignorado (Status ${statusCode})`)
      return NextResponse.json({
        success: true,
        message: "Duplicate webhook ignored",
        external_id,
        status_code: statusCode,
      })
    }

    // Mapear status SuperPay
    const statusInfo = STATUS_MAP[statusCode as keyof typeof STATUS_MAP] || {
      name: "unknown",
      title: "Status Desconhecido",
    }

    // Logs otimizados
    console.log(`⚡ [${external_id}] Status: ${statusCode} (${statusInfo.title}) - R$ ${(preco / 100).toFixed(2)}`)

    // Detectar status críticos
    const isPaid = statusCode === 5
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15

    if (isPaid) {
      console.log(`🎉 [${external_id}] CRÍTICO: PAGAMENTO CONFIRMADO!`)
    } else if (isCanceled || isRefunded || isDenied || isExpired) {
      console.log(`🚨 [${external_id}] CRÍTICO: ${statusInfo.title.toUpperCase()}!`)
    }

    // Preparar dados para armazenamento
    const webhookData = {
      statusCode,
      statusName: statusInfo.title,
      token,
      amount: preco / 100,
      payDate: invoice.payment?.payDate || new Date().toISOString(),
      pixCode: invoice.payment?.details?.pix_code || "",
      qrCode: invoice.payment?.details?.qrcode || "",
      gateway: invoice.payment?.gateway || "SuperPay",
      payId: invoice.payment?.payId || "",
      rawPayload: body,
    }

    // Salvar confirmação (assíncrono para Supabase)
    const confirmation = await savePaymentConfirmation(external_id, invoice.id, webhookData)

    const processingTime = Date.now() - startTime
    console.log(`✅ [${external_id}] Processado em ${processingTime}ms`)

    // Resposta otimizada para SuperPay
    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
        external_id,
        status_code: statusCode,
        status_name: statusInfo.title,
        is_critical: isPaid || isCanceled || isRefunded || isDenied || isExpired,
        processing_time_ms: processingTime,
        cache_size: paymentCache.size(),
      },
      { status: 200 },
    )
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ [${ip}] Erro webhook SuperPay (${processingTime}ms):`, error)

    // Log de erro otimizado
    realtimeEvents.unshift({
      eventType: "webhook_error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      ip,
      processing_time_ms: processingTime,
    })

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        processing_time_ms: processingTime,
      },
      { status: 500 },
    )
  }
}

// Método GET otimizado para estatísticas
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "stats") {
    return NextResponse.json({
      cache_size: paymentCache.size(),
      total_events: realtimeEvents.length,
      last_event: realtimeEvents[0] || null,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
    })
  }

  if (action === "health") {
    return NextResponse.json({
      status: "healthy",
      cache_size: paymentCache.size(),
      max_cache_size: 10000,
      events_count: realtimeEvents.length,
      supabase_pool_size: supabasePool.length,
    })
  }

  return NextResponse.json({
    message: "SuperPay Webhook Endpoint - High Performance",
    status: "Active",
    cache_size: paymentCache.size(),
    max_concurrent_payments: 10000,
  })
}

// Exportar cache para outros módulos
export { paymentCache, realtimeEvents }
