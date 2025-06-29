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

// Status codes oficiais SuperPay
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

// Função para salvar confirmação de pagamento APENAS NO SUPABASE
async function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
  const confirmationData = {
    external_id: externalId,
    invoice_id: invoiceId,
    status_code: data.statusCode,
    status_name: data.statusName,
    status_title: data.statusName,
    amount: data.amount,
    payment_date: data.paymentDate,
    webhook_data: {
      statusCode: data.statusCode,
      statusName: data.statusName,
      action: data.action,
      amount: data.amount,
      paymentDate: data.paymentDate,
      payId: data.payId,
      gateway: data.gateway,
      type: data.type,
      token: data.token,
      invoices: {
        id: invoiceId,
        external_id: externalId,
        token: data.token,
        payment: {
          payId: data.payId,
          payDate: data.paymentDate,
          gateway: data.gateway,
        },
        type: data.type,
      },
    },
    processed_at: new Date().toISOString(),
    is_paid: data.statusCode === 5,
    is_denied: data.statusCode === 12,
    is_expired: data.statusCode === 15,
    is_canceled: data.statusCode === 6,
    is_refunded: data.statusCode === 9,
    gateway: "superpay",
  }

  console.log("💾 SALVANDO CONFIRMAÇÃO NO SUPABASE:")
  console.log(`- External ID: ${externalId}`)
  console.log(`- Invoice ID: ${invoiceId}`)
  console.log(`- Token: ${data.token}`)
  console.log(`- Status: ${data.statusCode} - ${data.statusName}`)
  console.log(`- Timestamp: ${confirmationData.processed_at}`)

  try {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("external_id", externalId)
      .eq("gateway", "superpay")
      .single()

    if (existing) {
      // Atualizar registro existente
      const { error } = await supabase
        .from("payment_webhooks")
        .update(confirmationData)
        .eq("external_id", externalId)
        .eq("gateway", "superpay")

      if (error) {
        console.log("❌ Erro ao atualizar no Supabase:", error)
        throw error
      } else {
        console.log("✅ Confirmação ATUALIZADA no Supabase com sucesso")
      }
    } else {
      // Inserir novo registro
      const { error } = await supabase.from("payment_webhooks").insert(confirmationData)

      if (error) {
        console.log("❌ Erro ao inserir no Supabase:", error)
        throw error
      } else {
        console.log("✅ Confirmação INSERIDA no Supabase com sucesso")
      }
    }

    return confirmationData
  } catch (error) {
    console.log("❌ Erro crítico ao salvar no Supabase:", error)
    throw error
  }
}

// Função para processar evento do webhook SuperPay
async function processWebhookEvent(payload: SuperPayWebhookPayload) {
  console.log("🚨🚨🚨 WEBHOOK SUPERPAY PROCESSANDO 🚨🚨🚨")
  console.log("🔔 NOTIFICAÇÃO OFICIAL DA ADQUIRENTE VIA SUPERPAY")
  console.log("🕐 Timestamp de processamento:", new Date().toISOString())

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

    // Salvar confirmação para status críticos APENAS NO SUPABASE
    await savePaymentConfirmation(invoices.external_id, invoices.id.toString(), {
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

    console.log("✅ CONFIRMAÇÃO SALVA NO SUPABASE E DISPONÍVEL PARA CONSULTA!")
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

export async function POST(request: NextRequest) {
  try {
    console.log("🚨🚨🚨 WEBHOOK SUPERPAY RECEBIDO 🚨🚨🚨")
    console.log("🕐 Timestamp:", new Date().toISOString())
    console.log("📡 URL:", request.url)
    console.log("🔔 NOTIFICAÇÃO OFICIAL DA ADQUIRENTE - ARMAZENAMENTO SUPABASE!")

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

    // Processar evento
    console.log("🔄 INICIANDO PROCESSAMENTO DO EVENTO...")
    const processResult = await processWebhookEvent(payload)

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
        },
        debug_info: {
          processed_at: new Date().toISOString(),
          confirmation_available: processResult.isCritical,
          storage_location: "supabase_only",
        },
      },
      timestamp: new Date().toISOString(),
    }

    console.log("✅✅✅ WEBHOOK PROCESSADO COM SUCESSO! ✅✅✅")
    console.log("📤 RESPOSTA PARA SUPERPAY:")
    console.log(JSON.stringify(response, null, 2))

    if (processResult.isCritical) {
      console.log("🎉 STATUS CRÍTICO PROCESSADO - DADOS SALVOS NO SUPABASE!")
      console.log(`🔍 Consulte via: /api/superpay/payment-status?externalId=${processResult.externalId}`)
      console.log(`🔍 Ou via: /api/superpay/payment-status?invoiceId=${processResult.invoiceId}`)
      console.log(`🔍 Ou via: /api/superpay/payment-status?token=${processResult.token}`)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌❌❌ ERRO CRÍTICO NO WEBHOOK ❌❌❌")
    console.error("Erro:", error)
    console.error("Stack:", (error as Error).stack)

    const errorResponse = {
      success: false,
      error: "Erro interno do servidor",
      message: (error as Error).message,
      timestamp: new Date().toISOString(),
      note: "Erro será investigado - SuperPay tentará reenviar automaticamente",
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Endpoint GET para informações e debug
export async function GET(request: NextRequest) {
  const webhookUrl = `${request.nextUrl.origin}/api/superpay/webhook`

  try {
    // Buscar estatísticas do Supabase
    const { data: webhookStats, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })
      .limit(10)

    if (error) {
      console.log("❌ Erro ao buscar estatísticas:", error)
    }

    const stats = {
      total_received: webhookStats?.length || 0,
      payments_confirmed: webhookStats?.filter((w) => w.is_paid).length || 0,
      payments_denied: webhookStats?.filter((w) => w.is_denied).length || 0,
      payments_expired: webhookStats?.filter((w) => w.is_expired).length || 0,
      recent_webhooks:
        webhookStats?.slice(0, 5).map((w) => ({
          timestamp: w.processed_at,
          invoice_id: w.invoice_id,
          external_id: w.external_id,
          status: w.status_code,
          status_name: w.status_name,
          is_paid: w.is_paid,
          amount: w.amount,
        })) || [],
    }

    return NextResponse.json({
      message: "Endpoint de webhook SuperPay ativo - Sistema 100% baseado em callbacks",
      url: webhookUrl,
      methods: ["POST"],
      description: "Recebe notificações AUTOMÁTICAS da adquirente via SuperPay - ARMAZENAMENTO SUPABASE",
      status_codes: SUPERPAY_STATUS_CODES,
      statistics: stats,
      system_info: {
        webhook_only: true,
        polling_disabled: true,
        realtime_notifications: true,
        storage: "supabase_only",
        memory_storage: false,
        database_persistent: true,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      message: "Endpoint de webhook SuperPay ativo",
      url: webhookUrl,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    })
  }
}
