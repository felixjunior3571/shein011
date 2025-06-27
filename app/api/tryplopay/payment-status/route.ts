import { type NextRequest, NextResponse } from "next/server"
import { getGlobalInvoices } from "../create-invoice/route"

// Rate limiting por IP
const rateLimitMap = new Map()

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number; attempts?: number } {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 3

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + windowMs,
      blockUntil: 0,
      totalAttempts: 1,
    })
    return { allowed: true }
  }

  const limit = rateLimitMap.get(ip)

  // Verificar se está bloqueado
  if (limit.blockUntil > now) {
    const remainingTime = Math.ceil((limit.blockUntil - now) / 1000)
    return {
      allowed: false,
      resetTime: limit.blockUntil,
      attempts: limit.totalAttempts,
    }
  }

  // Reset da janela de tempo
  if (now > limit.resetTime) {
    limit.count = 1
    limit.resetTime = now + windowMs
    limit.totalAttempts++
    return { allowed: true }
  }

  // Verificar limite
  if (limit.count >= maxRequests) {
    limit.totalAttempts++

    // Sistema de bloqueio progressivo
    let blockDuration
    if (limit.totalAttempts <= 5)
      blockDuration = 5 * 60 * 1000 // 5 min
    else if (limit.totalAttempts <= 10)
      blockDuration = 30 * 60 * 1000 // 30 min
    else if (limit.totalAttempts <= 15)
      blockDuration = 60 * 60 * 1000 // 1 hora
    else if (limit.totalAttempts <= 20)
      blockDuration = 12 * 60 * 60 * 1000 // 12 horas
    else if (limit.totalAttempts <= 25)
      blockDuration = 24 * 60 * 60 * 1000 // 24 horas
    else if (limit.totalAttempts <= 30)
      blockDuration = 48 * 60 * 60 * 1000 // 48 horas
    else blockDuration = 100 * 60 * 60 * 1000 // 100 horas

    limit.blockUntil = now + blockDuration

    console.warn(
      `[RATE_LIMIT] IP ${ip} bloqueado por ${blockDuration / 1000 / 60} minutos. Tentativas: ${limit.totalAttempts}`,
    )

    return {
      allowed: false,
      resetTime: limit.blockUntil,
      attempts: limit.totalAttempts,
    }
  }

  limit.count++
  limit.totalAttempts++
  return { allowed: true }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    if (!externalId && !invoiceId && !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório não fornecido (externalId, invoiceId ou token)",
        },
        { status: 400 },
      )
    }

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"

    const rateLimit = checkRateLimit(clientIp)
    if (!rateLimit.allowed) {
      const remainingTime = Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit excedido",
          rate_limit: {
            blocked: true,
            reset_in_seconds: remainingTime,
            total_attempts: rateLimit.attempts,
          },
        },
        { status: 429 },
      )
    }

    // Buscar dados globalmente primeiro (dados do webhook)
    const globalInvoices = getGlobalInvoices()
    let invoice = null

    // Buscar por externalId primeiro
    if (externalId) {
      invoice = globalInvoices.get(externalId)
    }

    // Se não encontrou, buscar por outros identificadores
    if (!invoice && (invoiceId || token)) {
      for (const [key, value] of globalInvoices.entries()) {
        if ((invoiceId && value.id === invoiceId) || (token && value.token === token)) {
          invoice = value
          break
        }
      }
    }

    if (invoice) {
      console.log(`[PAYMENT_STATUS] Status encontrado localmente para ${externalId || invoiceId || token}`)

      return NextResponse.json({
        success: true,
        source: "webhook_data",
        externalId: externalId || invoice.external_id,
        status: invoice.status,
        paid: invoice.paid || invoice.status?.code === 5,
        cancelled: invoice.cancelled || invoice.status?.code === 6,
        refunded: invoice.refunded || invoice.status?.code === 7,
        amount: invoice.amount,
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,
        paid_at: invoice.paid_at,
        type: invoice.type || "unknown",
        payment_details: invoice.payment?.details,
      })
    }

    // Se não encontrou localmente e tem credenciais, tentar consultar API
    if (process.env.TRYPLOPAY_TOKEN && externalId) {
      try {
        console.log(`[PAYMENT_STATUS] Consultando TryploPay API para ${externalId}`)

        const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices?external_id=${externalId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000), // 5 segundos timeout
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`[PAYMENT_STATUS] Dados obtidos da API TryploPay`)

          return NextResponse.json({
            success: true,
            source: "api_query",
            externalId,
            status: data.status,
            paid: data.status?.code === 5,
            cancelled: data.status?.code === 6,
            refunded: data.status?.code === 7,
            amount: data.prices?.total,
            type: "real",
            payment_details: data.payment?.details,
            api_data: data,
          })
        } else {
          console.warn(`[PAYMENT_STATUS] API TryploPay retornou ${response.status}`)
        }
      } catch (error) {
        console.error(`[PAYMENT_STATUS] Erro ao consultar API TryploPay:`, error)
      }
    }

    // Não encontrado
    return NextResponse.json(
      {
        success: false,
        error: "Pagamento não encontrado",
        searched_for: { externalId, invoiceId, token },
      },
      { status: 404 },
    )
  } catch (error) {
    console.error("[PAYMENT_STATUS] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
