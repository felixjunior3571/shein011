import { type NextRequest, NextResponse } from "next/server"
import { getGlobalPaymentStatus } from "../webhook/route"

// Rate limiting por IP
const rateLimitMap = new Map()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minuto
  const maxRequests = 3 // Máximo 3 consultas por minuto

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }

  const limit = rateLimitMap.get(ip)
  if (now > limit.resetTime) {
    limit.count = 1
    limit.resetTime = now + windowMs
    return true
  }

  if (limit.count >= maxRequests) {
    return false
  }

  limit.count++
  return true
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      console.log(`[PAYMENT_STATUS] Rate limit exceeded for IP: ${clientIp}`)
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
    }

    if (!externalId && !invoiceId && !token) {
      return NextResponse.json({ error: "externalId, invoiceId ou token é obrigatório" }, { status: 400 })
    }

    console.log(`[PAYMENT_STATUS] Consultando status: ${externalId || invoiceId || token}`)

    // Primeiro, verificar dados do webhook (prioritário)
    const globalPaymentStatus = getGlobalPaymentStatus()

    if (externalId && globalPaymentStatus.has(externalId)) {
      const status = globalPaymentStatus.get(externalId)
      console.log(`[PAYMENT_STATUS] Status encontrado no webhook: ${status.status}`)

      return NextResponse.json({
        success: true,
        source: "webhook",
        paid: status.paid,
        cancelled: status.cancelled,
        refunded: status.refunded,
        pending: status.pending,
        status: status.status,
        statusTitle: status.statusTitle,
        statusDescription: status.statusDescription,
        amount: status.amount,
        externalId: status.externalId,
        invoiceId: status.invoiceId,
        token: status.token,
        updated_at: status.updated_at,
      })
    }

    // Se não encontrou no webhook, tentar consultar na API TryploPay
    try {
      let apiUrl = `${process.env.TRYPLOPAY_API_URL}/invoices`

      if (externalId) {
        apiUrl += `?external_id=${externalId}`
      } else if (invoiceId) {
        apiUrl += `/${invoiceId}`
      } else if (token) {
        apiUrl += `?token=${token}`
      }

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
        },
        signal: AbortSignal.timeout(8000), // 8 segundos timeout
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`[PAYMENT_STATUS] Resposta da API TryploPay:`, data)

        const invoice = data.invoices || data
        const status = invoice.status || {}

        const isPaid = status.code === 5
        const isCancelled = status.code === 6
        const isRefunded = status.code === 7
        const isPending = status.code === 1 || status.code === 3

        return NextResponse.json({
          success: true,
          source: "api",
          paid: isPaid,
          cancelled: isCancelled,
          refunded: isRefunded,
          pending: isPending,
          status: status.code,
          statusTitle: status.title,
          statusDescription: status.description,
          amount: invoice.prices?.total || 0,
          externalId: invoice.external_id,
          invoiceId: invoice.id,
          token: invoice.token,
          data: invoice,
        })
      } else {
        console.log(`[PAYMENT_STATUS] API TryploPay retornou: ${response.status}`)
      }
    } catch (apiError) {
      console.error(`[PAYMENT_STATUS] Erro na API TryploPay:`, apiError)
    }

    // Fallback para simulação se não encontrou em lugar nenhum
    console.log(`[PAYMENT_STATUS] Usando fallback simulado para: ${externalId || invoiceId || token}`)

    return NextResponse.json({
      success: true,
      source: "fallback",
      paid: false,
      cancelled: false,
      refunded: false,
      pending: true,
      status: 1,
      statusTitle: "Aguardando Pagamento",
      statusDescription: "Status não encontrado - usando fallback",
      amount: 0,
      externalId: externalId || "unknown",
      invoiceId: invoiceId || "unknown",
      token: token || "unknown",
    })
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
