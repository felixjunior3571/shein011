import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento em memória global para webhooks
const paymentConfirmations = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(webhookData, null, 2))

    // Extrair dados do webhook SuperPayBR
    const externalId = webhookData.external_id || webhookData.payment?.external_id || webhookData.id
    const statusCode = webhookData.status?.code || webhookData.status_code || 1
    const statusTitle = webhookData.status?.title || webhookData.status_name || "Aguardando"
    const amount = webhookData.amount || webhookData.payment?.amount || 0

    console.log("🔍 Dados extraídos do webhook:", {
      externalId,
      statusCode,
      statusTitle,
      amount,
    })

    if (!externalId) {
      console.log("⚠️ External ID não encontrado no webhook")
      return NextResponse.json({ success: true, message: "External ID não encontrado" })
    }

    // Mapear status codes SuperPayBR
    const statusMapping = {
      1: { isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false }, // Aguardando
      2: { isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false }, // Processando
      3: { isPaid: false, isDenied: true, isRefunded: false, isExpired: false, isCanceled: false }, // Negado
      4: { isPaid: false, isDenied: false, isRefunded: false, isExpired: true, isCanceled: false }, // Vencido
      5: { isPaid: true, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false }, // Pago
      6: { isPaid: false, isDenied: false, isRefunded: true, isExpired: false, isCanceled: false }, // Estornado
      7: { isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: true }, // Cancelado
    }

    const statusInfo = statusMapping[statusCode as keyof typeof statusMapping] || statusMapping[1]

    // Dados do pagamento para armazenamento
    const webhookPaymentData = {
      external_id: externalId,
      status_code: statusCode,
      status_name: statusTitle,
      amount: Number.parseFloat(amount.toString()) || 0,
      payment_date: statusInfo.isPaid ? new Date().toISOString() : null,
      timestamp: new Date().toISOString(),
      raw_webhook: webhookData,
      ...statusInfo,
    }

    console.log("💾 Dados do pagamento processados:", {
      external_id: webhookPaymentData.external_id,
      isPaid: webhookPaymentData.isPaid,
      isDenied: webhookPaymentData.isDenied,
      amount: webhookPaymentData.amount,
    })

    // Armazenar em memória global (principal)
    paymentConfirmations.set(externalId, webhookPaymentData)
    console.log("✅ Webhook armazenado em memória global")

    // Backup no Supabase (opcional)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { error } = await supabase.from("superpaybr_webhooks").upsert({
          external_id: externalId,
          status_code: statusCode,
          status_name: statusTitle,
          amount: webhookPaymentData.amount,
          is_paid: webhookPaymentData.isPaid,
          is_denied: webhookPaymentData.isDenied,
          is_refunded: webhookPaymentData.isRefunded,
          is_expired: webhookPaymentData.isExpired,
          is_canceled: webhookPaymentData.isCanceled,
          payment_date: webhookPaymentData.payment_date,
          raw_webhook: webhookData,
          created_at: new Date().toISOString(),
        })

        if (error) {
          console.log("⚠️ Erro ao salvar no Supabase:", error.message)
        } else {
          console.log("✅ Webhook salvo no Supabase como backup")
        }
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro no backup Supabase:", supabaseError)
    }

    console.log(`✅ Webhook SuperPayBR processado: ${externalId} - ${statusTitle}`)

    // SEMPRE retornar 200 OK para SuperPayBR
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      status: statusTitle,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)

    // SEMPRE retornar 200 OK mesmo com erro
    return NextResponse.json({
      success: true,
      message: "Webhook recebido (com erro interno)",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

export async function GET() {
  const totalWebhooks = paymentConfirmations.size
  const recentWebhooks = Array.from(paymentConfirmations.entries())
    .slice(-5)
    .map(([key, value]) => ({
      external_id: key,
      status: value.status_name,
      timestamp: value.timestamp,
    }))

  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    total_webhooks: totalWebhooks,
    recent_webhooks: recentWebhooks,
    timestamp: new Date().toISOString(),
  })
}

// Função para acessar dados de pagamento (usada por outros endpoints)
export function getPaymentData(externalId: string) {
  return paymentConfirmations.get(externalId) || null
}
