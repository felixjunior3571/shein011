import { type NextRequest, NextResponse } from "next/server"

const SUPERPAYBR_API_URL = process.env.SUPERPAYBR_API_URL || "https://api.superpaybr.com"
const SUPERPAYBR_TOKEN = process.env.SUPERPAYBR_TOKEN
const SUPERPAYBR_SECRET_KEY = process.env.SUPERPAYBR_SECRET_KEY

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")

    if (!externalId && !invoiceId) {
      return NextResponse.json({ error: "External ID ou Invoice ID é obrigatório" }, { status: 400 })
    }

    console.log("🔍 Verificando status do pagamento SuperPayBR:")
    console.log("- External ID:", externalId)
    console.log("- Invoice ID:", invoiceId)

    // 1. Primeiro verificar localStorage simulado global
    if (externalId) {
      const localStorageKey = `webhook_payment_${externalId}`
      const globalStorage = global.webhookLocalStorage || new Map()
      const webhookData = globalStorage.get(localStorageKey)

      if (webhookData) {
        const parsedData = JSON.parse(webhookData)
        console.log("✅ Dados encontrados no localStorage simulado:", parsedData)

        return NextResponse.json({
          success: true,
          data: parsedData,
          source: "webhook_localStorage",
          timestamp: new Date().toISOString(),
        })
      }
    }

    // 2. Se não encontrou no localStorage, consultar API SuperPayBR
    if (!SUPERPAYBR_TOKEN || !SUPERPAYBR_SECRET_KEY) {
      console.log("❌ Credenciais SuperPayBR não encontradas")
      return NextResponse.json({
        success: false,
        error: "Credenciais não configuradas",
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 1,
          statusName: "Aguardando Pagamento",
        },
        source: "api_unavailable",
        timestamp: new Date().toISOString(),
      })
    }

    // Consultar status na API SuperPayBR
    const apiUrl = externalId
      ? `${SUPERPAYBR_API_URL}/v1/invoices/external/${externalId}`
      : `${SUPERPAYBR_API_URL}/v1/invoices/${invoiceId}`

    console.log("📡 Consultando SuperPayBR API:", apiUrl)

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SUPERPAYBR_TOKEN}`,
        "X-Secret-Key": SUPERPAYBR_SECRET_KEY,
        "Content-Type": "application/json",
      },
    })

    const apiData = await response.json()

    console.log("📡 Resposta da API SuperPayBR:")
    console.log("Status:", response.status)
    console.log("Data:", JSON.stringify(apiData, null, 2))

    if (response.ok && apiData.success && apiData.data) {
      const invoice = apiData.data
      const statusCode = invoice.status?.code || 1

      // Mapear status SuperPayBR
      const statusMap = {
        1: {
          name: "Aguardando Pagamento",
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
        },
        2: {
          name: "Em Processamento",
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
        },
        3: {
          name: "Pagamento Agendado",
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
        },
        4: {
          name: "Autorizado",
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
        },
        5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
        6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
        8: {
          name: "Parcialmente Estornado",
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: true,
        },
        9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
        12: {
          name: "Pagamento Negado",
          isPaid: false,
          isDenied: true,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
        },
        15: {
          name: "Pagamento Vencido",
          isPaid: false,
          isDenied: false,
          isExpired: true,
          isCanceled: false,
          isRefunded: false,
        },
        16: {
          name: "Erro no Pagamento",
          isPaid: false,
          isDenied: true,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
        },
      }

      const statusInfo = statusMap[statusCode as keyof typeof statusMap] || statusMap[1]

      const paymentData = {
        externalId: invoice.external_id || externalId,
        invoiceId: invoice.id || invoiceId,
        amount: (invoice.amount || 0) / 100,
        statusCode,
        statusName: statusInfo.name,
        isPaid: statusInfo.isPaid,
        isDenied: statusInfo.isDenied,
        isExpired: statusInfo.isExpired,
        isCanceled: statusInfo.isCanceled,
        isRefunded: statusInfo.isRefunded,
        paymentDate: invoice.paid_at || (statusInfo.isPaid ? new Date().toISOString() : null),
        timestamp: new Date().toISOString(),
      }

      console.log("📊 Status processado:", paymentData)

      // Se o pagamento foi confirmado, salvar no localStorage simulado
      if (statusInfo.isPaid && externalId) {
        const localStorageKey = `webhook_payment_${externalId}`
        global.webhookLocalStorage = global.webhookLocalStorage || new Map()
        global.webhookLocalStorage.set(localStorageKey, JSON.stringify(paymentData))
        console.log("💾 Status PAGO salvo no localStorage simulado")
      }

      return NextResponse.json({
        success: true,
        data: paymentData,
        source: "api_superpaybr",
        timestamp: new Date().toISOString(),
      })
    } else {
      console.log("❌ Erro na consulta SuperPayBR:", apiData)

      return NextResponse.json({
        success: false,
        error: apiData.message || "Erro ao consultar status",
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 1,
          statusName: "Status Desconhecido",
        },
        source: "api_error",
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error("❌ Erro ao verificar status do pagamento:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: 1,
          statusName: "Erro na Consulta",
        },
        source: "server_error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
