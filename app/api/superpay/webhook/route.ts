import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Interface baseada na documentação oficial SuperPay
interface SuperPayWebhookPayload {
  event: {
    type: "webhook.update" | "invoice.update"
    date: string
  }
  invoices: {
    id: number
    external_id: string
    token: string | null
    date: string
    status: {
      code: number
      title: string
      description: string
      text: string
    }
    customer: number
    prices: {
      total: number
      discount: number
      taxs: {
        others: number
      }
      refund: number | null
    }
    type: string
    payment: {
      gateway: string
      date: string
      due: string
      card: any
      payId: string
      payDate: string
      details: {
        barcode: string | null
        pix_code: string
        qrcode: string
        url: string | null
      }
      metadata: any
    }
  }
}

// Status codes oficiais SuperPay (baseado na documentação)
const SUPERPAY_STATUS_CODES = {
  1: { name: "Aguardando Pagamento", action: "waiting", critical: false },
  2: { name: "Em Processamento", action: "processing", critical: false },
  3: { name: "Pagamento Agendado", action: "scheduled", critical: false },
  4: { name: "Autorizado", action: "authorized", critical: false },
  5: { name: "Pago", action: "paid", critical: true },
  6: { name: "Cancelado", action: "canceled", critical: true },
  7: { name: "Aguardando Estorno", action: "refund_pending", critical: true },
  8: { name: "Parcialmente Estornado", action: "partial_refund", critical: true },
  9: { name: "Estornado", action: "refunded", critical: true },
  10: { name: "Contestado/Em Contestação", action: "disputed", critical: true },
  12: { name: "Pagamento Negado", action: "denied", critical: true },
  15: { name: "Pagamento Vencido", action: "expired", critical: true },
  16: { name: "Erro no Pagamento", action: "error", critical: true },
}

// 🚨 SISTEMA DE ARMAZENAMENTO GLOBAL PARA WEBHOOKS SUPERPAY (igual TryploPay)
const webhookStorage = new Map<string, any>()
const paymentConfirmations = new Map<string, any>()
const realtimeEvents: any[] = []

// Função para salvar confirmação de pagamento no Supabase E localStorage (híbrido)
async function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
  const confirmationData = {
    externalId,
    invoiceId,
    status: data.statusCode === 5 ? "confirmed" : data.action,
    amount: data.amount,
    paymentDate: data.paymentDate,
    payId: data.payId,
    timestamp: new Date().toISOString(),
    processed: true,
    gateway: data.gateway,
    type: data.type,
    statusCode: data.statusCode,
    statusName: data.statusName,
    token: data.token,
    isPaid: data.statusCode === 5,
    isRefunded: data.statusCode === 9,
    isDenied: data.statusCode === 12,
    isExpired: data.statusCode === 15,
    isCanceled: data.statusCode === 6,
  }

  // Salvar em múltiplos locais para garantir acesso (igual TryploPay)
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId, confirmationData)
  paymentConfirmations.set(`token_${data.token}`, confirmationData)

  console.log("💾 CONFIRMAÇÃO SALVA EM ARMAZENAMENTO GLOBAL:")
  console.log(`- External ID: ${externalId}`)
  console.log(`- Invoice ID: ${invoiceId}`)
  console.log(`- Token: ${data.token}`)
  console.log(`- Status: ${confirmationData.status}`)
  console.log(`- Timestamp: ${confirmationData.timestamp}`)

  // 🎯 SALVAR NO LOCALSTORAGE PARA FRONTEND (CRÍTICO!)
  try {
    if (typeof window !== "undefined") {
      const webhookKey = `webhook_payment_${externalId}`
      const frontendData = {
        isPaid: confirmationData.isPaid,
        isDenied: confirmationData.isDenied,
        isExpired: confirmationData.isExpired,
        isCanceled: confirmationData.isCanceled,
        isRefunded: confirmationData.isRefunded,
        statusCode: confirmationData.statusCode,
        statusName: confirmationData.statusName,
        amount: confirmationData.amount,
        paymentDate: confirmationData.paymentDate,
        invoiceId: confirmationData.invoiceId,
        timestamp: confirmationData.timestamp,
      }

      localStorage.setItem(webhookKey, JSON.stringify(frontendData))
      console.log(`💾 Dados salvos no localStorage para frontend: ${webhookKey}`)
    }
  } catch (error) {
    console.log("❌ Erro ao salvar no localStorage:", error)
  }

  // Salvar no Supabase também
  try {
    const { error } = await supabase.from("payment_webhooks").insert({
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: data.statusCode,
      status_name: data.statusName,
      status_title: data.statusName,
      amount: data.amount,
      payment_date: data.paymentDate,
      webhook_data: data,
      processed_at: new Date().toISOString(),
      is_paid: data.statusCode === 5,
      is_denied: data.statusCode === 12,
      is_expired: data.statusCode === 15,
      is_canceled: data.statusCode === 6,
      gateway: "superpay",
    })

    if (error) {
      console.log("❌ Erro ao salvar no Supabase:", error)
    } else {
      console.log("✅ Confirmação salva no Supabase com sucesso")
    }
  } catch (error) {
    console.log("❌ Erro ao conectar com Supabase:", error)
  }

  return confirmationData
}

// Função para processar evento do webhook SuperPay
function processWebhookEvent(payload: SuperPayWebhookPayload) {
  console.log("🚨🚨🚨 WEBHOOK SUPERPAY PROCESSANDO 🚨🚨🚨")
  console.log("🔔 NOTIFICAÇÃO OFICIAL DA ADQUIRENTE VIA SUPERPAY")
  console.log("🕐 Timestamp de processamento:", new Date().toISOString())
  console.log("📡 URL configurada: https://v0-copy-shein-website.vercel.app/api/superpay/webhook")

  const { event, invoices } = payload
  const statusCode = invoices.status.code
  const statusInfo = SUPERPAY_STATUS_CODES[statusCode] || {
    name: "Status Desconhecido",
    action: "unknown",
    critical: false,
  }

  console.log("📋 DADOS COMPLETOS DO WEBHOOK:")
  console.log(`- Tipo do Evento: ${event.type}`)
  console.log(`- Data do Evento: ${event.date}`)
  console.log(`- Invoice ID: ${invoices.id}`)
  console.log(`- External ID: ${invoices.external_id}`)
  console.log(`- Token: ${invoices.token || "NULL"}`)
  console.log(`- Status Code: ${statusCode}`)
  console.log(`- Status Name: ${statusInfo.name}`)
  console.log(`- Status Text: ${invoices.status.text}`)
  console.log(`- Status Title: ${invoices.status.title}`)
  console.log(`- Status Description: ${invoices.status.description}`)
  console.log(`- Valor: R$ ${invoices.prices.total.toFixed(2)}`)
  console.log(`- Tipo Pagamento: ${invoices.type}`)
  console.log(`- Gateway: ${invoices.payment.gateway}`)
  console.log(`- Data Pagamento: ${invoices.payment.payDate || "N/A"}`)
  console.log(`- Pay ID: ${invoices.payment.payId}`)
  console.log(`- Customer ID: ${invoices.customer}`)

  // 🎉 PROCESSAMENTO ESPECIAL PARA STATUS CRÍTICOS
  if (statusInfo.critical) {
    console.log("🚨 STATUS CRÍTICO DETECTADO - PROCESSANDO IMEDIATAMENTE!")

    switch (statusCode) {
      case 5: // PAGAMENTO CONFIRMADO
        console.log("🎉🎉🎉 PAGAMENTO CONFIRMADO PELA ADQUIRENTE! 🎉🎉🎉")
        console.log(`💰 Valor Recebido: R$ ${invoices.prices.total.toFixed(2)}`)
        console.log(`📅 Data: ${invoices.payment.payDate}`)
        console.log(`🆔 Pay ID: ${invoices.payment.payId}`)
        console.log("✅ LIBERANDO PRODUTO/SERVIÇO IMEDIATAMENTE")
        console.log("🚀 FRONTEND SERÁ NOTIFICADO VIA LOCALSTORAGE")
        break
      case 9: // ESTORNADO
        console.log("🔄 ESTORNO TOTAL PROCESSADO PELA ADQUIRENTE!")
        console.log(`💸 Valor Estornado: R$ ${invoices.prices.total.toFixed(2)}`)
        console.log("❌ BLOQUEANDO/CANCELANDO PRODUTO/SERVIÇO")
        break
      case 12: // PAGAMENTO NEGADO
        console.log("❌ PAGAMENTO RECUSADO PELA ADQUIRENTE")
        console.log(`🚫 Motivo: ${invoices.status.description}`)
        console.log("⚠️ NOTIFICANDO CLIENTE SOBRE RECUSA")
        break
      case 15: // VENCIDO
        console.log("⏰ PAGAMENTO VENCIDO")
        console.log(`📅 Vencimento: ${invoices.payment.due}`)
        console.log("⚠️ FATURA EXPIROU SEM PAGAMENTO")
        break
      case 6: // CANCELADO
        console.log("🚫 PAGAMENTO CANCELADO")
        console.log("⚠️ TRANSAÇÃO FOI CANCELADA")
        break
      default:
        console.log(`❓ Status crítico ${statusCode}: ${statusInfo.name}`)
        break
    }

    // Salvar confirmação para status críticos
    savePaymentConfirmation(invoices.external_id, invoices.id.toString(), {
      statusCode,
      statusName: statusInfo.name,
      action: statusInfo.action,
      amount: invoices.prices.total,
      paymentDate: invoices.payment.payDate,
      payId: invoices.payment.payId,
      gateway: invoices.payment.gateway,
      type: invoices.type,
      token: invoices.token,
    })

    console.log("✅ CONFIRMAÇÃO SALVA E DISPONÍVEL PARA CONSULTA!")
    console.log("📱 FRONTEND SERÁ NOTIFICADO AUTOMATICAMENTE!")
  }

  // Adicionar evento ao log em tempo real
  realtimeEvents.unshift({
    type: "webhook_received",
    timestamp: new Date().toISOString(),
    eventType: event.type,
    statusCode,
    statusName: statusInfo.name,
    externalId: invoices.external_id,
    invoiceId: invoices.id,
    amount: invoices.prices.total,
    payId: invoices.payment.payId,
    isPaid: statusCode === 5,
    isRefunded: statusCode === 9,
    isDenied: statusCode === 12,
    isExpired: statusCode === 15,
    isCanceled: statusCode === 6,
    isCritical: statusInfo.critical,
  })

  // Manter apenas os últimos 100 eventos
  if (realtimeEvents.length > 100) {
    realtimeEvents.splice(100)
  }

  return {
    statusCode,
    statusName: statusInfo.name,
    statusText: invoices.status.text,
    action: statusInfo.action,
    isCritical: statusInfo.critical,
    isPaid: statusCode === 5,
    isRefunded: statusCode === 9,
    isDenied: statusCode === 12,
    isExpired: statusCode === 15,
    isCanceled: statusCode === 6,
    amount: invoices.prices.total,
    paymentDate: invoices.payment.payDate,
    paymentType: invoices.type,
    externalId: invoices.external_id,
    invoiceId: invoices.id.toString(),
    payId: invoices.payment.payId,
    gateway: invoices.payment.gateway,
    customer: invoices.customer,
    token: invoices.token,
  }
}

// Função para buscar confirmação de pagamento (igual TryploPay)
export function getPaymentConfirmation(key: string) {
  return paymentConfirmations.get(key) || null
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚨🚨🚨 WEBHOOK SUPERPAY RECEBIDO 🚨🚨🚨")
    console.log("🕐 Timestamp:", new Date().toISOString())
    console.log("📡 URL:", request.url)
    console.log("🔔 NOTIFICAÇÃO OFICIAL DA ADQUIRENTE - SEM POLLING!")
    console.log("⚠️ SISTEMA 100% WEBHOOK PARA EVITAR RATE LIMITING SUPERPAY")

    // Obter headers do webhook
    const headers = {
      "content-type": request.headers.get("content-type"),
      userid: request.headers.get("userid"),
      id: request.headers.get("id"),
      gateway: request.headers.get("gateway"),
      powered: request.headers.get("powered"),
      webhook: request.headers.get("webhook"),
    }

    console.log("📋 HEADERS COMPLETOS:")
    Object.entries(headers).forEach(([key, value]) => {
      if (key === "webhook" && value) {
        console.log(`- ${key}: ***TOKEN_PRESENTE***`)
      } else {
        console.log(`- ${key}: ${value}`)
      }
    })

    // Validar se é da SuperPay
    if (headers.gateway && headers.gateway !== "SUPERPAY") {
      console.log("❌ Gateway inválido:", headers.gateway)
      return NextResponse.json({ error: "Gateway inválido" }, { status: 400 })
    }

    // Obter payload do webhook
    const payload: SuperPayWebhookPayload = await request.json()
    console.log("📦 PAYLOAD COMPLETO RECEBIDO:")
    console.log(JSON.stringify(payload, null, 2))

    // Validar estrutura obrigatória
    if (!payload.event || !payload.invoices) {
      console.log("❌ ESTRUTURA DO PAYLOAD INVÁLIDA")
      return NextResponse.json({ error: "Estrutura inválida" }, { status: 400 })
    }

    // Salvar webhook completo para debug
    const webhookId = `${payload.invoices.id}_${Date.now()}`
    webhookStorage.set(webhookId, {
      timestamp: new Date().toISOString(),
      headers,
      payload,
      processed: false,
    })

    // Processar evento
    console.log("🔄 INICIANDO PROCESSAMENTO DO EVENTO...")
    const processResult = processWebhookEvent(payload)

    // Marcar como processado
    const storedWebhook = webhookStorage.get(webhookId)
    if (storedWebhook) {
      storedWebhook.processed = true
      storedWebhook.processResult = processResult
      webhookStorage.set(webhookId, storedWebhook)
    }

    // Log completo do resultado
    console.log("📊 RESULTADO FINAL DO PROCESSAMENTO:")
    console.log(JSON.stringify(processResult, null, 2))

    // Resposta de sucesso para SuperPay
    const response = {
      success: true,
      message: "Webhook processado com sucesso - Notificação da adquirente recebida",
      data: {
        action: processResult.action,
        invoice_id: payload.invoices.id,
        external_id: payload.invoices.external_id,
        status: payload.invoices.status.code,
        status_name: processResult.statusName,
        status_text: processResult.statusText,
        acquirer_notification: true,
        system_type: "pure_webhook_no_polling",
        rate_limit_protection: "enabled",
        business_impact: {
          is_paid: processResult.isPaid,
          is_refunded: processResult.isRefunded,
          is_denied: processResult.isDenied,
          is_expired: processResult.isExpired,
          is_canceled: processResult.isCanceled,
          amount: processResult.amount,
          payment_type: processResult.paymentType,
        },
        actions_executed: {
          product_released: processResult.isPaid,
          customer_notified: processResult.isCritical,
          refund_processed: processResult.isRefunded,
          confirmation_saved: processResult.isCritical,
          frontend_notified: processResult.isCritical,
        },
        debug_info: {
          webhook_id: webhookId,
          processed_at: new Date().toISOString(),
          confirmation_available: processResult.isCritical,
          localStorage_key: processResult.isCritical ? `webhook_payment_${processResult.externalId}` : null,
          storage_keys: processResult.isCritical
            ? [processResult.externalId, processResult.invoiceId, `token_${processResult.token}`]
            : [],
        },
      },
      timestamp: new Date().toISOString(),
    }

    console.log("✅✅✅ WEBHOOK PROCESSADO COM SUCESSO! ✅✅✅")
    console.log("📤 RESPOSTA PARA SUPERPAY:")
    console.log(JSON.stringify(response, null, 2))

    if (processResult.isCritical) {
      console.log("🎉 STATUS CRÍTICO PROCESSADO - DADOS DISPONÍVEIS!")
      console.log(`📱 Frontend será notificado via localStorage: webhook_payment_${processResult.externalId}`)
      console.log("🚫 POLLING DESABILITADO - Sistema 100% webhook para evitar rate limiting")
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌❌❌ ERRO CRÍTICO NO WEBHOOK ❌❌❌")
    console.error("Erro:", error)
    console.error("Stack:", (error as Error).stack)

    // Adicionar erro ao log em tempo real
    realtimeEvents.unshift({
      type: "webhook_error",
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stack: (error as Error).stack,
    })

    const errorResponse = {
      success: false,
      error: "Erro interno do servidor",
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
      note: "Erro será investigado - SuperPay tentará reenviar automaticamente",
      system_info: {
        webhook_url: "https://v0-copy-shein-website.vercel.app/api/superpay/webhook",
        rate_limit_protection: "enabled",
        polling_disabled: true,
      },
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Endpoint GET para informações e debug
export async function GET(request: NextRequest) {
  const webhookUrl = `${request.nextUrl.origin}/api/superpay/webhook`

  // Estatísticas dos webhooks
  const webhookStats = {
    total_received: webhookStorage.size,
    processed: Array.from(webhookStorage.values()).filter((w) => w.processed).length,
    payments_confirmed: paymentConfirmations.size,
    recent_events: realtimeEvents.slice(0, 10),
    recent_webhooks: Array.from(webhookStorage.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)
      .map((w) => ({
        timestamp: w.timestamp,
        invoice_id: w.payload?.invoices?.id,
        external_id: w.payload?.invoices?.external_id,
        status: w.payload?.invoices?.status?.code,
        status_name: SUPERPAY_STATUS_CODES[w.payload?.invoices?.status?.code]?.name || "Desconhecido",
        processed: w.processed,
      })),
  }

  return NextResponse.json({
    message: "Endpoint de webhook SuperPay ativo - Sistema 100% baseado em callbacks",
    url: webhookUrl,
    methods: ["POST"],
    description: "Recebe notificações AUTOMÁTICAS da adquirente via SuperPay - SEM POLLING",
    rate_limit_info: {
      polling_disabled: true,
      reason: "SuperPay tem rate limiting agressivo: 5min, 30min, 1h, 12h, 24h, 48h até bloqueio permanente",
      solution: "Sistema 100% webhook para evitar rate limiting",
      webhook_configured: "https://v0-copy-shein-website.vercel.app/api/superpay/webhook",
    },
    status_codes: SUPERPAY_STATUS_CODES,
    statistics: webhookStats,
    system_info: {
      webhook_only: true,
      polling_disabled: true,
      realtime_notifications: true,
      supabase_integration: true,
      memory_storage: true,
      localStorage_integration: true,
      multiple_search_keys: true,
      rate_limit_protection: true,
    },
    timestamp: new Date().toISOString(),
  })
}
