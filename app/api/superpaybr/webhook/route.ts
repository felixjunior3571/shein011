import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Mapeamento completo de status SuperPay conforme documentação
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
  }, // ✅ PAGO
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
  }, // ❌ NEGADO
  15: {
    name: "expired",
    title: "Pagamento Vencido",
    paid: false,
    denied: false,
    expired: true,
    canceled: false,
    refunded: false,
  }, // ⏰ VENCIDO
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
    console.log("🔔 WEBHOOK SUPERPAY RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Capturar headers do webhook
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers do webhook:", headers)

    // Parse do body do webhook
    const body = await request.json()
    console.log("📦 Dados do webhook SuperPay:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook SuperPay
    if (!body.event || !body.invoices) {
      console.error("❌ Estrutura de webhook SuperPay inválida")
      return NextResponse.json(
        {
          success: false,
          error: "Estrutura de webhook inválida",
          message: "Webhook deve conter 'event' e 'invoices'",
        },
        { status: 400 },
      )
    }

    // Extrair dados do webhook
    const { event, invoices } = body
    const invoice = invoices

    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const token = invoice.token
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const statusDescription = invoice.status.description
    const statusText = invoice.status.text
    const amount = invoice.prices?.total || 0
    const paymentDate = invoice.payment?.payDate
    const paymentDue = invoice.payment?.due
    const paymentGateway = invoice.payment?.gateway
    const qrCode = invoice.payment?.details?.qrcode

    console.log("🎯 Informações extraídas SuperPay:", {
      event_type: event.type,
      event_date: event.date,
      external_id: externalId,
      invoice_id: invoiceId,
      token: token,
      status_code: statusCode,
      status_title: statusTitle,
      status_text: statusText,
      amount: amount,
      payment_date: paymentDate,
      payment_gateway: paymentGateway,
      has_qr_code: !!qrCode,
    })

    // Obter informações do status
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

    // Preparar dados para salvar
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      token: token,
      status_code: statusCode,
      status_name: statusInfo.name,
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
      gateway: "superpaybr",
    }

    console.log("💾 Salvando webhook SuperPay:", {
      external_id: webhookRecord.external_id,
      invoice_id: webhookRecord.invoice_id,
      status_code: webhookRecord.status_code,
      status_title: webhookRecord.status_title,
      is_paid: webhookRecord.is_paid,
      amount: webhookRecord.amount,
    })

    // Salvar no banco usando upsert para evitar duplicatas
    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar webhook SuperPay:", dbError)

      // Se for erro de tabela não existir, retornar erro específico
      if (dbError.code === "42P01") {
        return NextResponse.json(
          {
            success: false,
            error: "Erro de banco de dados",
            message: "Não foi possível acessar a tabela payment_webhooks",
            hint: "Execute o script SQL: scripts/create-payment-webhooks-table.sql",
          },
          { status: 500 },
        )
      }

      throw dbError
    }

    console.log("✅ Webhook SuperPay salvo com sucesso!")

    // Log específico para status importantes
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`🆔 External ID: ${externalId}`)
      console.log(`🔑 Token: ${token}`)
      console.log(`📅 Data: ${paymentDate}`)
    } else if (statusCode === 12) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
      console.log(`🆔 External ID: ${externalId}`)
      console.log(`📝 Motivo: ${statusDescription}`)
    } else if (statusCode === 15) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
      console.log(`🆔 External ID: ${externalId}`)
    } else if (statusCode === 6) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
      console.log(`🆔 External ID: ${externalId}`)
    } else if (statusCode === 9) {
      console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
      console.log(`🆔 External ID: ${externalId}`)
    }

    // Retornar resposta de sucesso
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
        is_denied: statusInfo.denied,
        is_expired: statusInfo.expired,
        is_canceled: statusInfo.canceled,
        is_refunded: statusInfo.refunded,
        processed_at: new Date().toISOString(),
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

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay endpoint ativo",
      gateway: "superpaybr",
      timestamp: new Date().toISOString(),
      webhook_url: "https://v0-copy-shein-website.vercel.app/api/superpaybr/webhook",
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
