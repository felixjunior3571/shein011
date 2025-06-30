import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  saveSuperPayPaymentConfirmation,
  type SuperPayWebhookPayload,
  SUPERPAY_STATUS_CODES,
} from "@/lib/superpay-payment-storage"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Função para validar webhook SuperPay
function validateSuperPayWebhook(headers: Record<string, string>, body: any): boolean {
  try {
    // Verificar headers obrigatórios SuperPay
    const requiredHeaders = ["content-type", "userid", "gateway", "webhook"]
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

// Salvar confirmação de pagamento na memória e Supabase
async function savePaymentConfirmation(webhookData: SuperPayWebhookPayload) {
  try {
    const invoice = webhookData.invoices
    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const token = invoice.token
    const statusCode = invoice.status.code
    const amount = invoice.prices.total

    const statusInfo =
      SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]

    console.log(`🔄 Salvando webhook SuperPay:`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      is_paid: statusInfo.isPaid,
    })

    // Salvar na memória primeiro
    const memoryData = {
      statusCode,
      statusName: statusInfo.name,
      statusDescription: invoice.status.description,
      amount,
      paymentDate: statusInfo.isPaid ? invoice.payment.payDate : null,
    }

    const savedConfirmation = saveSuperPayPaymentConfirmation(externalId, invoiceId, token, memoryData)

    // Salvar no Supabase
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
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
      token: savedConfirmation.token,
      expires_at: savedConfirmation.expiresAt,
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
      // Continuar com armazenamento em memória mesmo se Supabase falhar
    }

    return savedConfirmation
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
    const criticalStatuses = [5, 6, 9, 10, 11, 12, 15] // Pago, Cancelado, Estornado, Falha, Bloqueado, Negado, Vencido
    const isCritical = criticalStatuses.includes(statusCode)

    console.log(`${isCritical ? "🚨" : "ℹ️"} Status ${statusCode} é ${isCritical ? "CRÍTICO" : "informativo"}`)

    if (isCritical) {
      // Salvar na memória e Supabase
      const savedConfirmation = await savePaymentConfirmation(webhookData)

      console.log("💾 Webhook SuperPay salvo:", {
        external_id: savedConfirmation.externalId,
        status: savedConfirmation.statusName,
        is_paid: savedConfirmation.isPaid,
        token: savedConfirmation.token,
        expires_at: savedConfirmation.expiresAt,
        storage: "memory + supabase",
      })

      // Log de status críticos
      if (statusCode === 5) {
        console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
        console.log(`💰 Valor: R$ ${amount.toFixed(2)}`)
        console.log(`🆔 External ID: ${externalId}`)
        console.log(`🔑 Token: ${savedConfirmation.token}`)
        console.log(`📅 Data: ${invoice.payment.payDate}`)
        console.log(`⏰ Token expira em: ${savedConfirmation.expiresAt}`)
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
      }
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
        storage: "memory + supabase",
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
    storage: "memory + supabase",
    supported_methods: ["POST"],
    critical_statuses: [5, 6, 9, 10, 11, 12, 15],
    token_expiry: "15 minutes",
    timestamp: new Date().toISOString(),
  })
}
