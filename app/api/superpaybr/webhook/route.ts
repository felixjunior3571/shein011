import { type NextRequest, NextResponse } from "next/server"

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

// Armazenamento global em memória
const paymentConfirmations = new Map<string, any>()
const realtimeEvents: any[] = []

// Mapeamento completo de status codes SuperPayBR (1-16)
const STATUS_MAP = {
  1: {
    name: "pending",
    title: "Aguardando Pagamento",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  2: {
    name: "processing",
    title: "Em Processamento",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  3: {
    name: "scheduled",
    title: "Pagamento Agendado",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  4: {
    name: "authorized",
    title: "Autorizado",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  5: {
    name: "paid",
    title: "Pago",
    isPaid: true,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  }, // ✅ CRÍTICO
  6: {
    name: "canceled",
    title: "Cancelado",
    isPaid: false,
    isCanceled: true,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  }, // 🚫 CRÍTICO
  7: {
    name: "refund_pending",
    title: "Aguardando Estorno",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  8: {
    name: "partially_refunded",
    title: "Parcialmente Estornado",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: true,
    isExpired: false,
  },
  9: {
    name: "refunded",
    title: "Estornado",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: true,
    isExpired: false,
  }, // 🔄 CRÍTICO
  10: {
    name: "disputed",
    title: "Contestado/Em Contestação",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  11: {
    name: "authorized",
    title: "Autorizado",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  12: {
    name: "denied",
    title: "Pagamento Negado",
    isPaid: false,
    isCanceled: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
  }, // ❌ CRÍTICO
  13: {
    name: "blocked",
    title: "Bloqueado",
    isPaid: false,
    isCanceled: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
  },
  14: {
    name: "suspended",
    title: "Suspenso",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  15: {
    name: "expired",
    title: "Vencido",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: true,
  }, // ⏰ CRÍTICO
  16: {
    name: "error",
    title: "Erro no Pagamento",
    isPaid: false,
    isCanceled: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
  },
} as const

function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
  const statusInfo = STATUS_MAP[data.statusCode as keyof typeof STATUS_MAP] || STATUS_MAP[1]

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
    statusName: statusInfo.title,
    amount: data.amount,
    paymentDate: data.payDate,
    pixCode: data.pixCode,
    qrCodeUrl: data.qrCode,
    receivedAt: new Date().toISOString(),
    rawData: data,
  }

  // Salvar com múltiplas chaves para facilitar busca
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId, confirmationData)
  paymentConfirmations.set(`token_${data.token}`, confirmationData)

  // Adicionar ao log de eventos em tempo real
  realtimeEvents.unshift({
    timestamp: new Date().toISOString(),
    type: "payment_update",
    data: confirmationData,
  })

  // Manter apenas os últimos 100 eventos
  if (realtimeEvents.length > 100) {
    realtimeEvents.splice(100)
  }

  return confirmationData
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚨 WEBHOOK SUPERPAY RECEBIDO 🚨")

    const body: SuperPayWebhookPayload = await request.json()
    console.log("📥 Webhook SuperPayBR payload:", JSON.stringify(body, null, 2))

    // Validar estrutura do payload
    if (!body.event || !body.invoices) {
      console.log("❌ Webhook SuperPayBR inválido - estrutura incorreta")
      return NextResponse.json({ error: "Invalid webhook structure" }, { status: 400 })
    }

    const { event, invoices } = body
    const invoice = invoices

    // Validações obrigatórias
    if (!invoice.external_id) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ error: "External ID required" }, { status: 400 })
    }

    if (!invoice.token) {
      console.log("❌ Token não encontrado no webhook")
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    if (!invoice.status || !invoice.status.code) {
      console.log("❌ Status code não encontrado no webhook")
      return NextResponse.json({ error: "Status code required" }, { status: 400 })
    }

    // Validar status code (1-16)
    if (invoice.status.code < 1 || invoice.status.code > 16) {
      console.log(`❌ Status code inválido: ${invoice.status.code}`)
      return NextResponse.json({ error: "Invalid status code" }, { status: 400 })
    }

    const statusCode = invoice.status.code
    const statusInfo = STATUS_MAP[statusCode as keyof typeof STATUS_MAP]

    console.log("📋 Dados do webhook processados:")
    console.log(`- Event Type: ${event.type}`)
    console.log(`- Invoice ID: ${invoice.id}`)
    console.log(`- External ID: ${invoice.external_id}`)
    console.log(`- Token: ${invoice.token}`)
    console.log(`- Status Code: ${statusCode}`)
    console.log(`- Status: ${statusInfo.title}`)
    console.log(`- Valor: R$ ${((invoice.prices?.total || 0) / 100).toFixed(2)}`)
    console.log(`- Gateway: ${invoice.payment?.gateway || "N/A"}`)

    // Detectar status críticos automaticamente
    const isCritical =
      statusInfo.isPaid || statusInfo.isDenied || statusInfo.isExpired || statusInfo.isCanceled || statusInfo.isRefunded

    if (isCritical) {
      console.log("🔥 STATUS CRÍTICO DETECTADO!")
      if (statusInfo.isPaid) {
        console.log("🎉 PAGAMENTO CONFIRMADO - LIBERAR PRODUTO!")
      } else if (statusInfo.isDenied) {
        console.log("❌ PAGAMENTO NEGADO - NOTIFICAR ERRO!")
      } else if (statusInfo.isExpired) {
        console.log("⏰ PAGAMENTO VENCIDO - EXPIRAR!")
      } else if (statusInfo.isCanceled) {
        console.log("🚫 PAGAMENTO CANCELADO - BLOQUEAR!")
      } else if (statusInfo.isRefunded) {
        console.log("🔄 PAGAMENTO ESTORNADO - CANCELAR!")
      }
    }

    // Preparar dados para armazenamento
    const webhookData = {
      statusCode,
      statusName: statusInfo.title,
      token: invoice.token,
      amount: (invoice.prices?.total || 0) / 100, // Converter de centavos para reais
      payDate: invoice.payment?.payDate || new Date().toISOString(),
      pixCode: invoice.payment?.details?.pix_code || "",
      qrCode: invoice.payment?.details?.qrcode || "",
      gateway: invoice.payment?.gateway || "SuperPayBR",
      rawPayload: body,
    }

    // Armazenar confirmação em memória global
    const confirmation = savePaymentConfirmation(invoice.external_id, invoice.id, webhookData)

    console.log("💾 Confirmação salva em memória global:")
    console.log(`- External ID: ${confirmation.externalId}`)
    console.log(`- Invoice ID: ${confirmation.invoiceId}`)
    console.log(`- isPaid: ${confirmation.isPaid}`)
    console.log(`- isDenied: ${confirmation.isDenied}`)
    console.log(`- isExpired: ${confirmation.isExpired}`)
    console.log(`- isCanceled: ${confirmation.isCanceled}`)
    console.log(`- isRefunded: ${confirmation.isRefunded}`)

    // Log final baseado no status
    if (statusInfo.isPaid) {
      console.log(
        `🎉 PAGAMENTO CONFIRMADO! External ID: ${invoice.external_id}, Valor: R$ ${((invoice.prices?.total || 0) / 100).toFixed(2)}`,
      )
    } else if (statusInfo.isDenied) {
      console.log(`❌ PAGAMENTO NEGADO! External ID: ${invoice.external_id}`)
    } else if (statusInfo.isExpired) {
      console.log(`⏰ PAGAMENTO VENCIDO! External ID: ${invoice.external_id}`)
    } else if (statusInfo.isCanceled) {
      console.log(`🚫 PAGAMENTO CANCELADO! External ID: ${invoice.external_id}`)
    } else if (statusInfo.isRefunded) {
      console.log(`🔄 PAGAMENTO ESTORNADO! External ID: ${invoice.external_id}`)
    } else {
      console.log(`📝 Status atualizado: ${statusInfo.title} - External ID: ${invoice.external_id}`)
    }

    // Resposta estruturada para a SuperPayBR (200 OK)
    return NextResponse.json({
      success: true,
      status: "processed",
      external_id: invoice.external_id,
      status_code: statusCode,
      is_critical: isCritical,
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Método OPTIONS para validação de webhook SuperPayBR
export async function OPTIONS(request: NextRequest) {
  try {
    console.log("=== VALIDAÇÃO WEBHOOK SUPERPAYBR ===")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("❌ Erro na validação webhook SuperPayBR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

// Exportar funções para uso em outros módulos
export { paymentConfirmations, realtimeEvents, savePaymentConfirmation }
