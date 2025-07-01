import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPay (gateway alternativo)
const STATUS_MAP = {
  1: {
    name: "pending",
    title: "Aguardando Pagamento",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  2: {
    name: "processing",
    title: "Em Processamento",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  5: {
    name: "paid",
    title: "Pagamento Confirmado",
    paid: true,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  6: {
    name: "canceled",
    title: "Cancelado",
    paid: false,
    denied: false,
    expired: false,
    canceled: true,
    refunded: false,
  },
  12: {
    name: "denied",
    title: "Pagamento Negado",
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
    refunded: false,
  },
  15: {
    name: "expired",
    title: "Pagamento Vencido",
    paid: false,
    denied: false,
    expired: true,
    canceled: false,
    refunded: false,
  },
} as const

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAY (ALTERNATIVO) RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    const body = await request.json()
    console.log("📦 Dados do webhook SuperPay alternativo:", JSON.stringify(body, null, 2))

    // Estrutura pode ser diferente do SuperPayBR
    const externalId = body.external_id || body.reference || body.id
    const statusCode = body.status || body.status_code || 1
    const amount = body.amount || body.value || 0

    if (!externalId) {
      console.error("❌ External ID não encontrado no webhook SuperPay alternativo")
      return NextResponse.json(
        {
          success: false,
          error: "External ID obrigatório",
          message: "Webhook deve conter external_id, reference ou id",
        },
        { status: 400 },
      )
    }

    const statusInfo = STATUS_MAP[statusCode as keyof typeof STATUS_MAP] || {
      name: "unknown",
      title: "Status Desconhecido",
      paid: false,
      denied: false,
      expired: false,
      canceled: false,
      refunded: false,
    }

    console.log("🎯 Processando SuperPay alternativo:", {
      external_id: externalId,
      status_code: statusCode,
      status_title: statusInfo.title,
      amount: amount,
      is_paid: statusInfo.paid,
    })

    // Salvar no banco
    const webhookRecord = {
      external_id: externalId,
      invoice_id: body.invoice_id || externalId,
      token: body.token || null,
      status_code: statusCode,
      status_title: statusInfo.title,
      status_description: body.description || null,
      status_text: statusInfo.name,
      amount: Number.parseFloat(amount.toString()) || 0,
      payment_date: body.payment_date ? new Date(body.payment_date).toISOString() : null,
      payment_due: body.due_date ? new Date(body.due_date).toISOString() : null,
      payment_gateway: "SuperPay",
      qr_code: body.qr_code || null,
      webhook_data: body,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.paid,
      is_denied: statusInfo.denied,
      is_expired: statusInfo.expired,
      is_canceled: statusInfo.canceled,
      is_refunded: statusInfo.refunded,
      gateway: "superpay",
    }

    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar webhook SuperPay alternativo:", dbError)
      throw dbError
    }

    console.log("✅ Webhook SuperPay alternativo salvo com sucesso!")

    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY ALTERNATIVO!")
    }

    return NextResponse.json({
      success: true,
      status: "processed",
      message: "Webhook SuperPay alternativo processado",
      data: {
        external_id: externalId,
        status_code: statusCode,
        status_title: statusInfo.title,
        is_paid: statusInfo.paid,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ ERRO NO WEBHOOK SUPERPAY ALTERNATIVO:", error)

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

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPay alternativo endpoint ativo",
    gateway: "superpay",
    timestamp: new Date().toISOString(),
    webhook_url: "https://v0-copy-shein-website.vercel.app/api/superpay/webhook",
  })
}
