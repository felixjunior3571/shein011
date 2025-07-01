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
  3: {
    name: "scheduled",
    title: "Pagamento Agendado",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  4: {
    name: "authorized",
    title: "Autorizado",
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
  7: {
    name: "refund_pending",
    title: "Aguardando Estorno",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  8: {
    name: "partially_refunded",
    title: "Parcialmente Estornado",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: true,
  },
  9: {
    name: "refunded",
    title: "Estornado",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: true,
  },
  10: {
    name: "disputed",
    title: "Contestado",
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
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
  16: {
    name: "error",
    title: "Erro no Pagamento",
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
    refunded: false,
  },
} as const

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAY (ALTERNATIVO) RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers do webhook:", headers)

    const body = await request.json()
    console.log("📦 Dados do webhook SuperPay:", JSON.stringify(body, null, 2))

    // Estrutura flexível para diferentes formatos de webhook
    let invoice, event

    // Formato 1: { event, invoices }
    if (body.event && body.invoices) {
      event = body.event
      invoice = body.invoices
    }
    // Formato 2: { invoice, event }
    else if (body.invoice && body.event) {
      event = body.event
      invoice = body.invoice
    }
    // Formato 3: dados diretos
    else if (body.id || body.external_id) {
      invoice = body
      event = { type: "payment.update", date: new Date().toISOString() }
    } else {
      console.error("❌ Estrutura de webhook SuperPay desconhecida")
      return NextResponse.json(
        {
          success: false,
          error: "Estrutura de webhook inválida",
          message: "Formato não reconhecido",
        },
        { status: 400 },
      )
    }

    const externalId = invoice.external_id || invoice.id
    const invoiceId = invoice.id || invoice.invoice_id
    const token = invoice.token
    const statusCode = invoice.status?.code || invoice.status_code || 1
    const statusTitle = invoice.status?.title || invoice.status_title || "Status Desconhecido"
    const statusDescription = invoice.status?.description || invoice.status_description
    const statusText = invoice.status?.text || invoice.status_text
    const amount = invoice.prices?.total || invoice.amount || invoice.value || 0
    const paymentDate = invoice.payment?.payDate || invoice.payment_date
    const paymentDue = invoice.payment?.due || invoice.payment_due
    const paymentGateway = invoice.payment?.gateway || "SuperPay"
    const qrCode = invoice.payment?.details?.qrcode || invoice.qr_code

    console.log("🎯 Informações extraídas SuperPay:", {
      event_type: event.type,
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_title: statusTitle,
      amount: amount,
      payment_date: paymentDate,
    })

    const statusInfo = STATUS_MAP[statusCode as keyof typeof STATUS_MAP]
    if (!statusInfo) {
      console.error(`❌ Status code SuperPay desconhecido: ${statusCode}`)
      return NextResponse.json(
        {
          success: false,
          error: "Status code desconhecido",
          message: `Status ${statusCode} não mapeado`,
        },
        { status: 400 },
      )
    }

    console.log(
      `${statusInfo.paid ? "🎉" : statusInfo.denied ? "❌" : statusInfo.expired ? "⏰" : statusInfo.canceled ? "🚫" : statusInfo.refunded ? "🔄" : "ℹ️"} Status ${statusCode} (${statusInfo.title})`,
    )

    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      token: token,
      status_code: statusCode,
      status_title: statusTitle,
      status_description: statusDescription,
      status_text: statusText,
      amount: Number.parseFloat(amount.toString()) || 0,
      payment_date: paymentDate ? new Date(paymentDate).toISOString() : null,
      payment_due: paymentDue ? new Date(paymentDue).toISOString() : null,
      payment_gateway: paymentGateway,
      qr_code: qrCode,
      webhook_data: body,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.paid,
      is_denied: statusInfo.denied,
      is_expired: statusInfo.expired,
      is_canceled: statusInfo.canceled,
      is_refunded: statusInfo.refunded,
      gateway: "superpay", // Gateway alternativo
    }

    console.log("💾 Salvando webhook SuperPay (alternativo):", {
      external_id: webhookRecord.external_id,
      status_code: webhookRecord.status_code,
      is_paid: webhookRecord.is_paid,
    })

    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar webhook SuperPay:", dbError)
      throw dbError
    }

    console.log("✅ Webhook SuperPay (alternativo) salvo com sucesso!")

    // Logs específicos por status
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`🆔 External ID: ${externalId}`)
    }

    const response = {
      success: true,
      status: "processed",
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: statusCode,
        status_title: statusTitle,
        amount: amount,
        is_paid: statusInfo.paid,
        gateway: "superpay",
        processed_at: new Date().toISOString(),
      },
    }

    console.log("✅ Resposta do webhook SuperPay:", response)
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

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay (alternativo) endpoint ativo",
      gateway: "superpay",
      timestamp: new Date().toISOString(),
      webhook_url: "https://v0-copy-shein-website.vercel.app/api/superpay/webhook",
      status_map: Object.keys(STATUS_MAP).map((code) => ({
        code: Number.parseInt(code),
        ...STATUS_MAP[code as keyof typeof STATUS_MAP],
      })),
    })
  } catch (error) {
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
