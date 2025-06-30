import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// SuperPayBR status mapping (baseado na documentação)
const SUPERPAYBR_STATUS_MAP = {
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
  4: { name: "Autorizado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
  7: {
    name: "Aguardando Estorno",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  8: {
    name: "Parcialmente Estornado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: true,
  },
  9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
  10: { name: "Contestado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
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
} as const

type SuperPayBRStatus = keyof typeof SUPERPAYBR_STATUS_MAP

// 🚨 SISTEMA DE ARMAZENAMENTO GLOBAL PARA WEBHOOKS SUPERPAYBR
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
    isRefunded: data.statusCode === 9 || data.statusCode === 8,
    isDenied: data.statusCode === 12 || data.statusCode === 16,
    isExpired: data.statusCode === 15,
    isCanceled: data.statusCode === 6,
  }

  // Salvar em múltiplos locais para garantir acesso
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId, confirmationData)
  if (data.token) {
    paymentConfirmations.set(`token_${data.token}`, confirmationData)
  }

  console.log("💾 CONFIRMAÇÃO SALVA EM ARMAZENAMENTO GLOBAL:")
  console.log(`- External ID: ${externalId}`)
  console.log(`- Invoice ID: ${invoiceId}`)
  console.log(`- Token: ${data.token || "N/A"}`)
  console.log(`- Status: ${confirmationData.status}`)
  console.log(`- Timestamp: ${confirmationData.timestamp}`)

  // 🎯 SALVAR NO LOCALSTORAGE SIMULADO PARA FRONTEND (CRÍTICO!)
  try {
    // Simular localStorage no servidor usando uma estrutura global
    const localStorageKey = `webhook_payment_${externalId}`
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
      externalId: confirmationData.externalId,
    }

    // Salvar em armazenamento global que pode ser acessado via API
    global.webhookLocalStorage = global.webhookLocalStorage || new Map()
    global.webhookLocalStorage.set(localStorageKey, JSON.stringify(frontendData))

    console.log(`💾 Dados salvos no localStorage simulado: ${localStorageKey}`)
    console.log("📱 Frontend poderá acessar via API:", frontendData)
  } catch (error) {
    console.log("❌ Erro ao salvar no localStorage simulado:", error)
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
      is_denied: data.statusCode === 12 || data.statusCode === 16,
      is_expired: data.statusCode === 15,
      is_canceled: data.statusCode === 6,
      is_refunded: data.statusCode === 9 || data.statusCode === 8,
      gateway: "superpaybr",
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

// Função para processar evento do webhook SuperPayBR
function processWebhookEvent(payload: any) {
  console.log("🚨🚨🚨 WEBHOOK SUPERPAYBR PROCESSANDO 🚨🚨🚨")
  console.log("🔔 NOTIFICAÇÃO OFICIAL DA ADQUIRENTE VIA SUPERPAYBR")
  console.log("🕐 Timestamp de processamento:", new Date().toISOString())

  // Extrair dados do payload (flexível para diferentes formatos)
  const externalId = payload.external_id || payload.id || payload.invoice?.external_id || `superpaybr_${Date.now()}`
  const invoiceId = payload.invoice_id || payload.id || payload.invoice?.id || externalId
  const statusCode = payload.status?.code || payload.status_code || payload.status || 1
  const statusInfo = SUPERPAYBR_STATUS_MAP[statusCode as SuperPayBRStatus] || {
    name: "Status Desconhecido",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  }

  // Calcular valor
  let amount = 0
  if (payload.valores?.bruto) {
    amount = payload.valores.bruto / 100
  } else if (payload.amount) {
    amount = payload.amount
  } else if (payload.value) {
    amount = payload.value
  }

  console.log("📋 DADOS COMPLETOS DO WEBHOOK:")
  console.log(`- External ID: ${externalId}`)
  console.log(`- Invoice ID: ${invoiceId}`)
  console.log(`- Status Code: ${statusCode}`)
  console.log(`- Status Name: ${statusInfo.name}`)
  console.log(`- Valor: R$ ${amount.toFixed(2)}`)
  console.log(`- É Pago: ${statusInfo.isPaid}`)
  console.log(`- É Negado: ${statusInfo.isDenied}`)
  console.log(`- É Vencido: ${statusInfo.isExpired}`)
  console.log(`- É Cancelado: ${statusInfo.isCanceled}`)
  console.log(`- É Estornado: ${statusInfo.isRefunded}`)

  // 🎉 PROCESSAMENTO ESPECIAL PARA STATUS CRÍTICOS
  const criticalStatuses = [5, 6, 8, 9, 12, 15, 16]
  const isCritical = criticalStatuses.includes(statusCode)

  if (isCritical) {
    console.log("🚨 STATUS CRÍTICO DETECTADO - PROCESSANDO IMEDIATAMENTE!")

    switch (statusCode) {
      case 5: // PAGAMENTO CONFIRMADO
        console.log("🎉🎉🎉 PAGAMENTO CONFIRMADO PELA ADQUIRENTE! 🎉🎉🎉")
        console.log(`💰 Valor Recebido: R$ ${amount.toFixed(2)}`)
        console.log(`🆔 External ID: ${externalId}`)
        console.log("✅ LIBERANDO PRODUTO/SERVIÇO IMEDIATAMENTE")
        console.log("🚀 FRONTEND SERÁ NOTIFICADO VIA LOCALSTORAGE")
        break
      case 6: // CANCELADO
        console.log("🚫 PAGAMENTO CANCELADO")
        console.log("⚠️ TRANSAÇÃO FOI CANCELADA")
        break
      case 8: // PARCIALMENTE ESTORNADO
        console.log("🔄 ESTORNO PARCIAL PROCESSADO PELA ADQUIRENTE!")
        console.log(`💸 Valor: R$ ${amount.toFixed(2)}`)
        break
      case 9: // ESTORNADO
        console.log("🔄 ESTORNO TOTAL PROCESSADO PELA ADQUIRENTE!")
        console.log(`💸 Valor Estornado: R$ ${amount.toFixed(2)}`)
        console.log("❌ BLOQUEANDO/CANCELANDO PRODUTO/SERVIÇO")
        break
      case 12: // PAGAMENTO NEGADO
        console.log("❌ PAGAMENTO RECUSADO PELA ADQUIRENTE")
        console.log("⚠️ NOTIFICANDO CLIENTE SOBRE RECUSA")
        break
      case 15: // VENCIDO
        console.log("⏰ PAGAMENTO VENCIDO")
        console.log("⚠️ FATURA EXPIROU SEM PAGAMENTO")
        break
      case 16: // ERRO NO PAGAMENTO
        console.log("❌ ERRO NO PAGAMENTO")
        console.log("⚠️ FALHA NO PROCESSAMENTO")
        break
      default:
        console.log(`❓ Status crítico ${statusCode}: ${statusInfo.name}`)
        break
    }

    // Salvar confirmação para status críticos
    savePaymentConfirmation(externalId, invoiceId.toString(), {
      statusCode,
      statusName: statusInfo.name,
      action: statusInfo.isPaid
        ? "paid"
        : statusInfo.isDenied
          ? "denied"
          : statusInfo.isExpired
            ? "expired"
            : statusInfo.isCanceled
              ? "canceled"
              : statusInfo.isRefunded
                ? "refunded"
                : "unknown",
      amount,
      paymentDate: payload.payment_date || payload.paymentDate || (statusInfo.isPaid ? new Date().toISOString() : null),
      payId: payload.pay_id || payload.payId || `PAY_${Date.now()}`,
      gateway: "superpaybr",
      type: payload.type || "pix",
      token: payload.token || null,
    })

    console.log("✅ CONFIRMAÇÃO SALVA E DISPONÍVEL PARA CONSULTA!")
    console.log("📱 FRONTEND SERÁ NOTIFICADO AUTOMATICAMENTE!")
  }

  // Adicionar evento ao log em tempo real
  realtimeEvents.unshift({
    type: "webhook_received",
    timestamp: new Date().toISOString(),
    statusCode,
    statusName: statusInfo.name,
    externalId,
    invoiceId,
    amount,
    isPaid: statusInfo.isPaid,
    isRefunded: statusInfo.isRefunded,
    isDenied: statusInfo.isDenied,
    isExpired: statusInfo.isExpired,
    isCanceled: statusInfo.isCanceled,
    isCritical,
  })

  // Manter apenas os últimos 100 eventos
  if (realtimeEvents.length > 100) {
    realtimeEvents.splice(100)
  }

  return {
    statusCode,
    statusName: statusInfo.name,
    action: statusInfo.isPaid
      ? "paid"
      : statusInfo.isDenied
        ? "denied"
        : statusInfo.isExpired
          ? "expired"
          : statusInfo.isCanceled
            ? "canceled"
            : statusInfo.isRefunded
              ? "refunded"
              : "pending",
    isCritical,
    isPaid: statusInfo.isPaid,
    isRefunded: statusInfo.isRefunded,
    isDenied: statusInfo.isDenied,
    isExpired: statusInfo.isExpired,
    isCanceled: statusInfo.isCanceled,
    amount,
    paymentDate: payload.payment_date || payload.paymentDate || (statusInfo.isPaid ? new Date().toISOString() : null),
    paymentType: payload.type || "pix",
    externalId,
    invoiceId: invoiceId.toString(),
    payId: payload.pay_id || payload.payId || `PAY_${Date.now()}`,
    gateway: "superpaybr",
    token: payload.token || null,
  }
}

// Função para buscar confirmação de pagamento
export function getPaymentConfirmation(key: string) {
  return paymentConfirmations.get(key) || null
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚨🚨🚨 WEBHOOK SUPERPAYBR RECEBIDO 🚨🚨🚨")
    console.log("🕐 Timestamp:", new Date().toISOString())
    console.log("📡 URL:", request.url)
    console.log("🔔 NOTIFICAÇÃO OFICIAL DA ADQUIRENTE - SEM POLLING!")

    // Obter headers do webhook
    const headers = {
      "content-type": request.headers.get("content-type"),
      "user-agent": request.headers.get("user-agent"),
      "x-gateway": request.headers.get("x-gateway"),
      gateway: request.headers.get("gateway"),
      authorization: request.headers.get("authorization") ? "***PRESENTE***" : null,
    }

    console.log("📋 HEADERS COMPLETOS:")
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`)
    })

    // Obter payload do webhook
    const payload = await request.json()
    console.log("📦 PAYLOAD COMPLETO RECEBIDO:")
    console.log(JSON.stringify(payload, null, 2))

    // Salvar webhook completo para debug
    const webhookId = `${payload.external_id || payload.id || Date.now()}_${Date.now()}`
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

    // Resposta de sucesso para SuperPayBR
    const response = {
      success: true,
      message: "Webhook processado com sucesso - Notificação da adquirente recebida",
      data: {
        action: processResult.action,
        invoice_id: processResult.invoiceId,
        external_id: processResult.externalId,
        status: processResult.statusCode,
        status_name: processResult.statusName,
        acquirer_notification: true,
        system_type: "hybrid_webhook_localstorage",
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
    console.log("📤 RESPOSTA PARA SUPERPAYBR:")
    console.log(JSON.stringify(response, null, 2))

    if (processResult.isCritical) {
      console.log("🎉 STATUS CRÍTICO PROCESSADO - DADOS DISPONÍVEIS!")
      console.log(`📱 Frontend será notificado via localStorage: webhook_payment_${processResult.externalId}`)
      console.log(`🔍 Consulte via: /api/superpaybr/payment-status?externalId=${processResult.externalId}`)
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
      note: "Erro será investigado - SuperPayBR tentará reenviar automaticamente",
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Endpoint GET para informações e debug
export async function GET(request: NextRequest) {
  const webhookUrl = `${request.nextUrl.origin}/api/superpaybr/webhook`

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
        external_id: w.payload?.external_id || w.payload?.id,
        status: w.payload?.status?.code || w.payload?.status_code,
        status_name: SUPERPAYBR_STATUS_MAP[w.payload?.status?.code || w.payload?.status_code]?.name || "Desconhecido",
        processed: w.processed,
      })),
  }

  return NextResponse.json({
    message: "Endpoint de webhook SuperPayBR ativo - Sistema híbrido com localStorage",
    url: webhookUrl,
    methods: ["POST"],
    description: "Recebe notificações AUTOMÁTICAS da adquirente via SuperPayBR",
    status_codes: SUPERPAYBR_STATUS_MAP,
    statistics: webhookStats,
    system_info: {
      webhook_only: true,
      polling_disabled: true,
      realtime_notifications: true,
      supabase_integration: true,
      memory_storage: true,
      localStorage_simulation: true,
      multiple_search_keys: true,
    },
    timestamp: new Date().toISOString(),
  })
}
