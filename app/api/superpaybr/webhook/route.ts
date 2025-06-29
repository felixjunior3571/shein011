import { type NextRequest, NextResponse } from "next/server"

// Armazenamento global em memória
const paymentConfirmations = new Map<string, any>()
const realtimeEvents: any[] = []

// Interface do payload SuperPayBR
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

// Mapear status codes SuperPayBR
function mapSuperpayStatus(statusCode: number) {
  const statusMap: Record<
    number,
    { name: string; isPaid: boolean; isDenied: boolean; isRefunded: boolean; isExpired: boolean; isCanceled: boolean }
  > = {
    1: {
      name: "Aguardando Pagamento",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    },
    2: {
      name: "Em Processamento",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    },
    3: {
      name: "Aguardando Confirmação",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    },
    4: { name: "Processando", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false },
    5: { name: "Pago", isPaid: true, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false }, // CRÍTICO
    6: { name: "Cancelado", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: true }, // CRÍTICO
    7: { name: "Pendente", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false },
    8: {
      name: "Processando Estorno",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    },
    9: { name: "Estornado", isPaid: false, isDenied: false, isRefunded: true, isExpired: false, isCanceled: false }, // CRÍTICO
    10: {
      name: "Falha no Processamento",
      isPaid: false,
      isDenied: true,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    },
    11: {
      name: "Aguardando Análise",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    },
    12: { name: "Negado", isPaid: false, isDenied: true, isRefunded: false, isExpired: false, isCanceled: false }, // CRÍTICO
    13: { name: "Contestado", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false },
    14: { name: "Chargeback", isPaid: false, isDenied: false, isRefunded: true, isExpired: false, isCanceled: false },
    15: { name: "Vencido", isPaid: false, isDenied: false, isRefunded: false, isExpired: true, isCanceled: false }, // CRÍTICO
    16: { name: "Erro", isPaid: false, isDenied: true, isRefunded: false, isExpired: false, isCanceled: false },
  }

  return (
    statusMap[statusCode] || {
      name: "Status Desconhecido",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    }
  )
}

// Salvar confirmação de pagamento
function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
  const statusInfo = mapSuperpayStatus(data.statusCode)

  const confirmationData = {
    externalId,
    invoiceId,
    token: data.token,
    isPaid: statusInfo.isPaid,
    isCanceled: statusInfo.isCanceled,
    isRefunded: statusInfo.isRefunded,
    isDenied: statusInfo.isDenied,
    isExpired: statusInfo.isExpired,
    statusCode: data.statusCode,
    statusName: statusInfo.name,
    amount: data.amount,
    paymentDate: data.payDate,
    pixCode: data.pixCode,
    qrCodeUrl: data.qrCode,
    receivedAt: new Date().toISOString(),
    gateway: data.gateway,
    payId: data.payId,
  }

  // Salvar em múltiplas chaves para facilitar lookup
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId, confirmationData)
  paymentConfirmations.set(`token_${data.token}`, confirmationData)

  // Adicionar aos eventos em tempo real
  realtimeEvents.unshift({
    ...confirmationData,
    eventType: "webhook_received",
    timestamp: new Date().toISOString(),
  })

  // Manter apenas os últimos 100 eventos
  if (realtimeEvents.length > 100) {
    realtimeEvents.splice(100)
  }

  console.log(`💾 Confirmação salva para External ID: ${externalId}`)
  console.log(`📊 Total de confirmações: ${paymentConfirmations.size}`)
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚨 WEBHOOK SUPERPAY RECEBIDO 🚨")

    // Obter payload
    const payload: SuperPayWebhookPayload = await request.json()

    console.log("📦 Payload completo:", JSON.stringify(payload, null, 2))

    // Validações obrigatórias
    if (!payload.event || payload.event.type !== "invoice.update") {
      console.log("❌ Tipo de evento inválido:", payload.event?.type)
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    if (!payload.invoices) {
      console.log("❌ Dados da fatura não encontrados")
      return NextResponse.json({ error: "Invoice data missing" }, { status: 400 })
    }

    const invoice = payload.invoices
    const statusCode = invoice.status?.code
    const external_id = invoice.external_id
    const token = invoice.token

    // Validar campos obrigatórios
    if (!statusCode || !external_id || !token) {
      console.log("❌ Campos obrigatórios ausentes:", { statusCode, external_id, token })
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 })
    }

    // Validar status code (1-16)
    if (statusCode < 1 || statusCode > 16) {
      console.log("❌ Status code inválido:", statusCode)
      return NextResponse.json({ error: "Invalid status code" }, { status: 400 })
    }

    // Logs detalhados
    const statusInfo = mapSuperpayStatus(statusCode)
    const preco = invoice.prices?.total || 0

    console.log(`- Status Code: ${statusCode}`)
    console.log(`- Status Name: ${statusInfo.name}`)
    console.log(`- External ID: ${external_id}`)
    console.log(`- Token: ${token}`)
    console.log(`- Valor: R$ ${(preco / 100).toFixed(2)}`)
    console.log(`- Gateway: ${invoice.payment?.gateway || "N/A"}`)
    console.log(`- Pay ID: ${invoice.payment?.payId || "N/A"}`)

    // Detectar status críticos
    if (statusInfo.isPaid) {
      console.log("🎉 STATUS CRÍTICO: PAGAMENTO CONFIRMADO!")
    } else if (statusInfo.isDenied) {
      console.log("❌ STATUS CRÍTICO: PAGAMENTO NEGADO!")
    } else if (statusInfo.isRefunded) {
      console.log("🔄 STATUS CRÍTICO: PAGAMENTO ESTORNADO!")
    } else if (statusInfo.isExpired) {
      console.log("⏰ STATUS CRÍTICO: PAGAMENTO VENCIDO!")
    } else if (statusInfo.isCanceled) {
      console.log("🚫 STATUS CRÍTICO: PAGAMENTO CANCELADO!")
    }

    // Salvar confirmação
    savePaymentConfirmation(external_id, invoice.id, {
      statusCode,
      token,
      amount: preco / 100,
      payDate: invoice.payment?.payDate || new Date().toISOString(),
      pixCode: invoice.payment?.details?.pix_code || "",
      qrCode: invoice.payment?.details?.qrcode || "",
      gateway: invoice.payment?.gateway || "SuperPayBR",
      payId: invoice.payment?.payId || "",
    })

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    // Resposta estruturada para SuperPayBR
    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
        external_id,
        status_code: statusCode,
        status_name: statusInfo.name,
        processed_at: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)

    // Adicionar erro aos eventos
    realtimeEvents.unshift({
      eventType: "webhook_error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Método GET para debug
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "stats") {
    return NextResponse.json({
      total_confirmations: paymentConfirmations.size,
      total_events: realtimeEvents.length,
      last_event: realtimeEvents[0] || null,
    })
  }

  if (action === "events") {
    return NextResponse.json({
      events: realtimeEvents.slice(0, 20), // Últimos 20 eventos
    })
  }

  return NextResponse.json({
    message: "SuperPayBR Webhook Endpoint",
    status: "Active",
    total_confirmations: paymentConfirmations.size,
    total_events: realtimeEvents.length,
  })
}

// Exportar funções para uso em outros módulos
export { paymentConfirmations, realtimeEvents }
