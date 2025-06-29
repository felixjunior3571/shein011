import { type NextRequest, NextResponse } from "next/server"
import { getWebhookData } from "../webhook/route"

// Cache para evitar consultas excessivas
const statusCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5000 // 5 segundos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    // Verificar cache primeiro
    const cached = statusCache.get(externalId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📋 Status em cache: ${externalId}`)
      return NextResponse.json(cached.data)
    }

    console.log(`🔍 Consultando status SuperPayBR: ${externalId}`)

    // Consultar webhook storage (sem rate limit)
    const webhookData = getWebhookData(externalId)

    if (webhookData) {
      const status = webhookData.status || {}
      const statusCode = status.code || 1

      const responseData = {
        success: true,
        data: {
          external_id: externalId,
          status: {
            code: statusCode,
            text: status.text || "pending",
            title: status.title || "Aguardando Pagamento",
          },
          amount: webhookData.amount || 0,
          payment_date: webhookData.payment_date,
          is_paid: statusCode === 2 || status.text === "paid" || status.text === "approved",
          is_denied: statusCode === 3 || status.text === "denied" || status.text === "rejected",
          is_expired: statusCode === 4 || status.text === "expired",
          is_canceled: statusCode === 5 || status.text === "canceled",
          is_refunded: statusCode === 6 || status.text === "refunded",
          source: "webhook",
          timestamp: webhookData.timestamp,
        },
      }

      // Salvar no cache
      statusCache.set(externalId, { data: responseData, timestamp: Date.now() })

      console.log(`✅ Status encontrado no webhook: ${status.title}`)
      return NextResponse.json(responseData)
    }

    // Se não encontrou no webhook, retornar status padrão
    const defaultResponse = {
      success: true,
      data: {
        external_id: externalId,
        status: {
          code: 1,
          text: "pending",
          title: "Aguardando Pagamento",
        },
        amount: 0,
        payment_date: null,
        is_paid: false,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        source: "default",
        timestamp: new Date().toISOString(),
      },
    }

    // Salvar no cache
    statusCache.set(externalId, { data: defaultResponse, timestamp: Date.now() })

    console.log(`ℹ️ Status padrão retornado: ${externalId}`)
    return NextResponse.json(defaultResponse)
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
