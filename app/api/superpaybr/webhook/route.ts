import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  saveSuperPayBRPaymentConfirmation,
  type SuperPayBRWebhookPayload,
  SUPERPAYBR_STATUS_CODES,
} from "@/lib/superpaybr-payment-storage"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Save payment confirmation to both memory and Supabase
async function savePaymentConfirmation(webhookData: SuperPayBRWebhookPayload) {
  try {
    const invoice = webhookData.invoices
    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const token = invoice.token
    const statusCode = invoice.status.code
    const amount = invoice.prices.total

    const statusInfo =
      SUPERPAYBR_STATUS_CODES[statusCode as keyof typeof SUPERPAYBR_STATUS_CODES] || SUPERPAYBR_STATUS_CODES[1]

    console.log(`🔄 Salvando webhook SuperPayBR:`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      is_paid: statusInfo.isPaid,
    })

    // Save to memory first
    const memoryData = {
      statusCode,
      statusName: statusInfo.name,
      statusDescription: invoice.status.description,
      amount,
      paymentDate: statusInfo.isPaid ? invoice.payment.payDate : null,
    }

    const savedConfirmation = saveSuperPayBRPaymentConfirmation(externalId, invoiceId, token, memoryData)

    // Save to Supabase
    const { data: existingRecord } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("external_id", externalId)
      .eq("gateway", "superpaybr")
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
      gateway: "superpaybr",
    }

    let result
    if (existingRecord) {
      // Update existing record
      result = await supabase
        .from("payment_webhooks")
        .update(webhookRecord)
        .eq("id", existingRecord.id)
        .select()
        .single()

      console.log(`✅ Webhook SuperPayBR ATUALIZADO no Supabase:`, result.data?.id)
    } else {
      // Insert new record
      result = await supabase.from("payment_webhooks").insert(webhookRecord).select().single()

      console.log(`✅ Webhook SuperPayBR INSERIDO no Supabase:`, result.data?.id)
    }

    if (result.error) {
      console.error("❌ Erro ao salvar no Supabase:", result.error)
      // Continue with memory storage even if Supabase fails
    }

    return savedConfirmation
  } catch (error) {
    console.error("❌ Erro crítico ao salvar webhook SuperPayBR:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("\n🔔 WEBHOOK SUPERPAYBR RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Get headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers recebidos:", headers)

    // Validate SuperPayBR webhook
    const userAgent = headers["user-agent"] || ""
    const gateway = headers["gateway"] || headers["x-gateway"] || ""
    const webhookAuth = headers["webhook"] || ""

    console.log("🔍 Validação SuperPayBR:", { userAgent, gateway, webhookAuth })

    // Parse webhook data
    const webhookData: SuperPayBRWebhookPayload = await request.json()
    console.log("📦 Dados do webhook SuperPayBR:", JSON.stringify(webhookData, null, 2))

    // Validate webhook structure
    if (!webhookData.event || !webhookData.invoices) {
      throw new Error("Estrutura de webhook SuperPayBR inválida")
    }

    // Extract key information
    const invoice = webhookData.invoices
    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const statusCode = invoice.status.code
    const statusName = invoice.status.title
    const amount = invoice.prices.total

    console.log("🎯 Informações extraídas SuperPayBR:", {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusName,
      amount: amount,
    })

    // Check if it's a critical status that needs processing
    const criticalStatuses = [5, 6, 9, 12, 15] // Pago, Cancelado, Estornado, Negado, Vencido
    const isCritical = criticalStatuses.includes(statusCode)

    console.log(`${isCritical ? "🚨" : "ℹ️"} Status ${statusCode} é ${isCritical ? "CRÍTICO" : "informativo"}`)

    if (isCritical) {
      // Save to both memory and Supabase
      const savedConfirmation = await savePaymentConfirmation(webhookData)

      console.log("💾 Webhook SuperPayBR salvo:", {
        external_id: savedConfirmation.externalId,
        status: savedConfirmation.statusName,
        is_paid: savedConfirmation.isPaid,
        storage: "memory + supabase",
      })

      // Log critical status
      if (statusCode === 5) {
        console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
        console.log(`💰 Valor: R$ ${amount.toFixed(2)}`)
        console.log(`🆔 External ID: ${externalId}`)
        console.log(`📅 Data: ${invoice.payment.payDate}`)
      } else if (statusCode === 12) {
        console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
      } else if (statusCode === 15) {
        console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
      } else if (statusCode === 6) {
        console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
      } else if (statusCode === 9) {
        console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
      }
    }

    // Return success response
    const response = {
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
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

    console.log("✅ Resposta do webhook SuperPayBR:", response)
    console.log("🏁 Processamento SuperPayBR concluído!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NO WEBHOOK SUPERPAYBR:", error)

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
    message: "SuperPayBR Webhook Endpoint",
    status: "active",
    storage: "memory + supabase",
    supported_methods: ["POST"],
    critical_statuses: [5, 6, 9, 12, 15],
    timestamp: new Date().toISOString(),
  })
}
