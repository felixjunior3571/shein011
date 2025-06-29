import { type NextRequest, NextResponse } from "next/server"
import { getWebhookData } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status do pagamento SuperPayBR:", externalId)

    // Consultar no armazenamento global primeiro (sem rate limit)
    const webhookData = getWebhookData(externalId)

    if (webhookData) {
      console.log("✅ Dados encontrados no armazenamento global")

      const status = webhookData.status || {}
      const statusCode = status.code || status.status || 1

      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          status: {
            code: statusCode,
            text: status.text || status.name || "pending",
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
      })
    }

    console.log("⚠️ Dados não encontrados no webhook, consultando API SuperPayBR...")

    // Se não encontrou no webhook, consultar API (com rate limit)
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    if (!authResponse.ok) {
      throw new Error("Falha na autenticação SuperPayBR")
    }

    const authData = await authResponse.json()
    const accessToken = authData.access_token

    if (!accessToken) {
      throw new Error("Token SuperPayBR não obtido")
    }

    // Consultar status na API SuperPayBR
    const apiUrl = process.env.SUPERPAY_API_URL
    const statusResponse = await fetch(`${apiUrl}/v4/invoices/${externalId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })

    if (!statusResponse.ok) {
      throw new Error(`Erro na consulta SuperPayBR: ${statusResponse.status}`)
    }

    const statusData = await statusResponse.json()
    console.log("📋 Resposta da API SuperPayBR:", JSON.stringify(statusData, null, 2))

    const apiStatus = statusData.data?.status || statusData.status || {}
    const apiStatusCode = apiStatus.code || apiStatus.status || 1

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        status: {
          code: apiStatusCode,
          text: apiStatus.text || apiStatus.name || "pending",
          title: apiStatus.title || "Aguardando Pagamento",
        },
        amount: statusData.data?.amount || statusData.amount || 0,
        payment_date: statusData.data?.payment_date || statusData.payment_date,
        is_paid: apiStatusCode === 2 || apiStatus.text === "paid" || apiStatus.text === "approved",
        is_denied: apiStatusCode === 3 || apiStatus.text === "denied" || apiStatus.text === "rejected",
        is_expired: apiStatusCode === 4 || apiStatus.text === "expired",
        is_canceled: apiStatusCode === 5 || apiStatus.text === "canceled",
        is_refunded: apiStatusCode === 6 || apiStatus.text === "refunded",
        source: "api",
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        external_id: request.nextUrl.searchParams.get("external_id"),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Use GET para consultar status do pagamento",
    timestamp: new Date().toISOString(),
  })
}
