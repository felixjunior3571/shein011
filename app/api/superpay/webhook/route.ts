import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status codes SuperPay (1-15)
const STATUS_MAP: Record<number, { name: string; isCritical: boolean }> = {
  1: { name: "Aguardando Pagamento", isCritical: false },
  2: { name: "Em Processamento", isCritical: false },
  3: { name: "Processando", isCritical: false },
  4: { name: "Aprovado", isCritical: false },
  5: { name: "Pago", isCritical: true },
  6: { name: "Cancelado", isCritical: true },
  7: { name: "Contestado", isCritical: false },
  8: { name: "Chargeback", isCritical: true },
  9: { name: "Estornado", isCritical: true },
  10: { name: "Falha", isCritical: true },
  11: { name: "Bloqueado", isCritical: true },
  12: { name: "Negado", isCritical: true },
  13: { name: "Análise", isCritical: false },
  14: { name: "Análise Manual", isCritical: false },
  15: { name: "Vencido", isCritical: true },
}

function generateToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_${timestamp}_${random}`
}

function getExpirationTime(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 15) // 15 minutos conforme documentação
  return now.toISOString()
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPay recebido")

    const body = await request.json()
    console.log("📥 Dados do webhook SuperPay:", body)

    // Validar campos obrigatórios
    const { external_id, invoice_id, status, amount } = body

    if (!external_id || !invoice_id || status === undefined) {
      console.error("❌ Campos obrigatórios ausentes no webhook SuperPay")
      return NextResponse.json(
        {
          success: false,
          error: "Campos obrigatórios: external_id, invoice_id, status",
        },
        { status: 400 },
      )
    }

    const statusCode = Number.parseInt(status)
    const statusInfo = STATUS_MAP[statusCode] || { name: `Status ${statusCode}`, isCritical: false }

    // Gerar token único com expiração
    const token = generateToken()
    const expiresAt = getExpirationTime()

    // Determinar flags de status
    const isPaid = statusCode === 5
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9

    const webhookData = {
      external_id: external_id,
      invoice_id: invoice_id,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: Number.parseFloat(amount) || 0,
      payment_date: isPaid ? new Date().toISOString() : null,
      processed_at: new Date().toISOString(),
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
      is_critical: statusInfo.isCritical,
      gateway: "superpay",
      token: token,
      expires_at: expiresAt,
      webhook_data: body,
    }

    console.log("💾 Salvando webhook SuperPay no Supabase:", {
      external_id: webhookData.external_id,
      status_code: webhookData.status_code,
      status_name: webhookData.status_name,
      is_critical: webhookData.is_critical,
      token: webhookData.token,
    })

    // Salvar no Supabase
    const { data, error } = await supabase.from("payment_webhooks").insert([webhookData]).select().single()

    if (error) {
      console.error("❌ Erro ao salvar webhook SuperPay no Supabase:", error)
      throw error
    }

    console.log("✅ Webhook SuperPay salvo com sucesso:", {
      id: data.id,
      external_id: data.external_id,
      status: data.status_name,
      token: data.token,
    })

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        id: data.id,
        external_id: data.external_id,
        status_code: data.status_code,
        status_name: data.status_name,
        is_paid: data.is_paid,
        is_critical: data.is_critical,
        token: data.token,
        expires_at: data.expires_at,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Retornar 200 para evitar retry do SuperPay
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPay endpoint ativo",
    gateway: "superpay",
    timestamp: new Date().toISOString(),
  })
}
