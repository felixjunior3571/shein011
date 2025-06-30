import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// SuperPay Status Codes baseado na documentação oficial
const SUPERPAY_STATUS_CODES = {
  1: {
    name: "Aguardando Pagamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  2: {
    name: "Em Processamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  3: {
    name: "Processando",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  4: {
    name: "Aprovado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  5: {
    name: "Pago",
    isPaid: true,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: true,
  },
  6: {
    name: "Cancelado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: true,
    isRefunded: false,
    isCritical: true,
  },
  7: {
    name: "Contestado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  8: {
    name: "Chargeback",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: true,
  },
  9: {
    name: "Estornado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: true,
    isCritical: true,
  },
  10: {
    name: "Falha",
    isPaid: false,
    isDenied: true,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: true,
  },
  11: {
    name: "Bloqueado",
    isPaid: false,
    isDenied: true,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: true,
  },
  12: {
    name: "Negado",
    isPaid: false,
    isDenied: true,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: true,
  },
  13: {
    name: "Análise",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  14: {
    name: "Análise Manual",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    isCritical: false,
  },
  15: {
    name: "Vencido",
    isPaid: false,
    isDenied: false,
    isExpired: true,
    isCanceled: false,
    isRefunded: false,
    isCritical: true,
  },
} as const

// Interface para o payload do webhook SuperPay baseado na documentação
interface SuperPayWebhookPayload {
  event: {
    type: string
    date: string
  }
  invoices: {
    id: string
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
      refound: number | null
    }
    type: string
    payment: {
      gateway: string
      date: string
      due: string
      card: any | null
      payId: string | null
      payDate: string
      details: {
        barcode: string | null
        pix_code: string | null
        qrcode: string
        url: string | null
      }
    }
  }
}

// Função para validar webhook SuperPay
function validateSuperPayWebhook(headers: Record<string, string>, body: any): boolean {
  try {
    // Verificar headers obrigatórios SuperPay
    const requiredHeaders = ["content-type", "user-agent"]
    const hasRequiredHeaders = requiredHeaders.every((header) =>
      Object.keys(headers).some((key) => key.toLowerCase() === header),
    )

    if (!hasRequiredHeaders) {
      console.log("❌ Headers SuperPay obrigatórios ausentes")
      return false
    }

    // Verificar estrutura do payload
    if (!body.event || !body.invoices) {
      console.log("❌ Estrutura de payload SuperPay inválida")
      return false
    }

    // Verificar campos obrigatórios
    const invoice = body.invoices
    if (!invoice.id || !invoice.external_id || !invoice.status) {
      console.log("❌ Campos obrigatórios SuperPay ausentes")
      return false
    }

    return true
  } catch (error) {
    console.log("❌ Erro na validação SuperPay:", error)
    return false
  }
}

// Função para gerar token único com expiração
function generateSuperPayToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_${timestamp}_${random}`
}

// Salvar confirmação de pagamento no Supabase
async function savePaymentConfirmation(webhookData: SuperPayWebhookPayload) {
  try {
    const invoice = webhookData.invoices
    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const statusCode = invoice.status.code
    const amount = invoice.prices.total

    const statusInfo =
      SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]

    // Gerar token único com expiração de 15 minutos
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    const token = generateSuperPayToken()

    console.log(`🔄 Salvando webhook SuperPay:`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      is_paid: statusInfo.isPaid,
      token: token,
    })

    // Verificar se registro existe
    const { data: existingRecord } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("external_id", externalId)
      .eq("gateway", "superpay")
      .single()

    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      payment_date: statusInfo.isPaid ? invoice.payment.payDate : null,
      webhook_data: webhookData,
      processed_at: now.toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
      token: token,
      expires_at: expiresAt.toISOString(),
      is_critical: statusInfo.isCritical,
    }

    let result
    if (existingRecord) {
      // Atualizar registro existente
      result = await supabase
        .from("payment_webhooks")
        .update(webhookRecord)
        .eq("id", existingRecord.id)
        .select()
        .single()

      console.log(`✅ Webhook SuperPay ATUALIZADO no Supabase:`, result.data?.id)
    } else {
      // Inserir novo registro
      result = await supabase.from("payment_webhooks").insert(webhookRecord).select().single()

      console.log(`✅ Webhook SuperPay INSERIDO no Supabase:`, result.data?.id)
    }

    if (result.error) {
      console.error("❌ Erro ao salvar no Supabase:", result.error)
      throw result.error
    }

    return {
      ...result.data,
      token,
      expiresAt: expiresAt.toISOString(),
    }
  } catch (error) {
    console.error("❌ Erro crítico ao salvar webhook SuperPay:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔔 WEBHOOK SUPERPAY RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Obter headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers recebidos:", headers)

    // Parse dos dados do webhook
    const webhookData: SuperPayWebhookPayload = await request.json()
    console.log("📦 Dados do webhook SuperPay:", JSON.stringify(webhookData, null, 2))

    // Validar webhook SuperPay
    if (!validateSuperPayWebhook(headers, webhookData)) {
      console.log("❌ Webhook SuperPay inválido")
      return NextResponse.json(
        {
          success: false,
          error: "Webhook SuperPay inválido",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Extrair informações principais
    const invoice = webhookData.invoices
    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const statusCode = invoice.status.code
    const statusName = invoice.status.title
    const amount = invoice.prices.total

    console.log("🎯 Informações extraídas SuperPay:", {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusName,
      amount: amount,
    })

    // Verificar se é um status crítico que precisa de processamento
    const statusInfo =
      SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]
    const isCritical = statusInfo.isCritical

    console.log(`${isCritical ? "🚨" : "ℹ️"} Status ${statusCode} é ${isCritical ? "CRÍTICO" : "informativo"}`)

    // Salvar no Supabase (sempre salvar, mas processar apenas críticos)
    const savedConfirmation = await savePaymentConfirmation(webhookData)

    console.log("💾 Webhook SuperPay salvo:", {
      external_id: savedConfirmation.external_id,
      status: savedConfirmation.status_name,
      is_paid: savedConfirmation.is_paid,
      token: savedConfirmation.token,
      expires_at: savedConfirmation.expires_at,
      is_critical: isCritical,
    })

    // Log de status críticos
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
      console.log(`💰 Valor: R$ ${amount.toFixed(2)}`)
      console.log(`🆔 External ID: ${externalId}`)
      console.log(`🔑 Token: ${savedConfirmation.token}`)
      console.log(`📅 Data: ${invoice.payment.payDate}`)
      console.log(`⏰ Token expira em: ${savedConfirmation.expires_at}`)
    } else if (statusCode === 12) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 15) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 6) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 9) {
      console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 10 || statusCode === 11) {
      console.log("❌ PAGAMENTO FALHOU/BLOQUEADO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 8) {
      console.log("⚠️ CHARGEBACK DETECTADO VIA WEBHOOK SUPERPAY!")
    }

    // Retornar resposta de sucesso
    const response = {
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: statusCode,
        status_name: statusName,
        amount: amount,
        is_critical: isCritical,
        processed_at: new Date().toISOString(),
        token: savedConfirmation.token,
        expires_at: savedConfirmation.expires_at,
      },
    }

    console.log("✅ Resposta do webhook SuperPay:", response)
    console.log("🏁 Processamento SuperPay concluído!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NO WEBHOOK SUPERPAY:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "SuperPay Webhook Endpoint",
    status: "active",
    supported_methods: ["POST"],
    critical_statuses: [5, 6, 8, 9, 10, 11, 12, 15],
    token_expiry: "15 minutes",
    rate_limits: {
      polling_intervals: ["5min", "30min", "1h", "12h", "24h", "48h", "24h_until_100h"],
      max_hours: 100,
    },
    timestamp: new Date().toISOString(),
  })
}
