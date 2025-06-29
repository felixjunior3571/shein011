import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
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
    receivedAt: new Date().toISOString(),
    gateway: "superpaybr",
  }

  // Salvar com múltiplas chaves para facilitar lookup
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

  return confirmationData
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚨 WEBHOOK SUPERPAY RECEBIDO 🚨")

    const body: SuperPayWebhookPayload = await request.json()
    console.log("📥 Webhook SuperPayBR payload:", JSON.stringify(body, null, 2))

    // Validações obrigatórias - Estrutura do payload
    if (!body.event || body.event.type !== "invoice.update") {
      console.log("❌ Tipo de evento inválido:", body.event?.type)
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 })
    }

    if (!body.invoices) {
      console.log("❌ Dados da fatura não encontrados")
      return NextResponse.json({ error: "Invoice data missing" }, { status: 400 })
    }

    const invoice = body.invoices

    // Validações obrigatórias - Campos essenciais
    if (!invoice.external_id) {
      console.log("❌ External ID não encontrado")
      return NextResponse.json({ error: "External ID required" }, { status: 400 })
    }

    if (!invoice.token) {
      console.log("❌ Token não encontrado")
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    if (!invoice.status || !invoice.status.code) {
      console.log("❌ Status code não encontrado")
      return NextResponse.json({ error: "Status code required" }, { status: 400 })
    }

    const statusCode = invoice.status.code
    const external_id = invoice.external_id
    const token = invoice.token
    const preco = invoice.prices?.total || 0

    // Validar status code (1-16)
    if (statusCode < 1 || statusCode > 16) {
      console.log(`❌ Status code inválido: ${statusCode}`)
      return NextResponse.json({ error: "Invalid status code" }, { status: 400 })
    }

    // Mapear status SuperPayBR
    const statusInfo = STATUS_MAP[statusCode as keyof typeof STATUS_MAP] || {
      name: "unknown",
      title: "Status Desconhecido",
    }

    // Logs detalhados para debug
    console.log(`- Status Code: ${statusCode}`)
    console.log(`- External ID: ${external_id}`)
    console.log(`- Valor: R$ ${(preco / 100).toFixed(2)}`)
    console.log(`- Status: ${statusInfo.title}`)
    console.log(`- Token: ${token}`)
    console.log(`- Gateway: ${invoice.payment?.gateway || "N/A"}`)
    console.log(`- Pay ID: ${invoice.payment?.payId || "N/A"}`)

    // Detectar status críticos automaticamente
    const isPaid = statusCode === 5
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15

    if (isPaid) {
      console.log("🎉 STATUS CRÍTICO: PAGAMENTO CONFIRMADO - LIBERAR PRODUTO!")
    } else if (isCanceled) {
      console.log("🚫 STATUS CRÍTICO: PAGAMENTO CANCELADO - BLOQUEAR!")
    } else if (isRefunded) {
      console.log("🔄 STATUS CRÍTICO: PAGAMENTO ESTORNADO - CANCELAR!")
    } else if (isDenied) {
      console.log("❌ STATUS CRÍTICO: PAGAMENTO NEGADO - NOTIFICAR ERRO!")
    } else if (isExpired) {
      console.log("⏰ STATUS CRÍTICO: PAGAMENTO VENCIDO - EXPIRAR!")
    }

    // Preparar dados para armazenamento
    const webhookData = {
      statusCode,
      statusName: statusInfo.title,
      token,
      amount: preco / 100, // Converter de centavos para reais
      payDate: invoice.payment?.payDate || new Date().toISOString(),
      pixCode: invoice.payment?.details?.pix_code || "",
      qrCode: invoice.payment?.details?.qrcode || "",
      gateway: invoice.payment?.gateway || "SuperPayBR",
      payId: invoice.payment?.payId || "",
    }

    // Armazenar confirmações em memória global
    const confirmation = savePaymentConfirmation(external_id, invoice.id, webhookData)

    // Tentar salvar webhook no Supabase (com fallback)
    try {
      const supabaseData = {
        external_id,
        invoice_id: invoice.id,
        token,
        status_code: statusCode,
        status_name: statusInfo.name,
        status_description: statusInfo.title,
        amount: preco / 100,
        payment_date: invoice.payment?.payDate || null,
        is_paid: isPaid,
        is_denied: isDenied,
        is_refunded: isRefunded,
        is_expired: isExpired,
        is_canceled: isCanceled,
        webhook_data: body,
        gateway: "superpaybr",
        processed_at: new Date().toISOString(),
        received_at: new Date().toISOString(),
      }

      const { error: dbError } = await supabase.from("payment_webhooks").upsert(supabaseData, {
        onConflict: "external_id,gateway",
      })

      if (dbError) {
        console.log("⚠️ Erro ao salvar webhook SuperPayBR no Supabase (continuando com memória):", dbError.message)
      } else {
        console.log("✅ Webhook SuperPayBR salvo no Supabase com sucesso")
      }
    } catch (dbError) {
      console.log("⚠️ Erro de conexão com Supabase (continuando com memória):", dbError)
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    // Resposta estruturada para a SuperPayBR (200 OK)
    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
        external_id,
        status_code: statusCode,
        status_name: statusInfo.title,
        is_critical: isPaid || isCanceled || isRefunded || isDenied || isExpired,
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

// Método GET para debug e estatísticas
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
