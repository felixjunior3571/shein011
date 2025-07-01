import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 SuperPay Webhook recebido")

    // Capturar headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers:", headers)

    // Capturar body
    const body = await request.json()
    console.log("📦 Body completo:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook
    if (!body.invoices || !body.invoices.external_id) {
      console.error("❌ Estrutura de webhook inválida")
      return NextResponse.json(
        {
          success: false,
          error: "Estrutura de webhook inválida",
          message: "Campo invoices.external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    const invoice = body.invoices
    const status = invoice.status || {}
    const payment = invoice.payment || {}
    const prices = invoice.prices || {}

    // Mapear status da SuperPay
    const statusCode = status.code
    const isStatusFinal = [5, 6, 9, 12, 15].includes(statusCode)

    // Determinar flags de status
    const statusFlags = {
      is_paid: statusCode === 5, // Pagamento Confirmado
      is_denied: statusCode === 12, // Negado
      is_expired: statusCode === 15, // Vencido
      is_canceled: statusCode === 6, // Cancelado
      is_refunded: statusCode === 9, // Estornado
    }

    console.log(`📊 Status Code: ${statusCode} | Final: ${isStatusFinal}`)
    console.log("🏷️ Status Flags:", statusFlags)

    // Preparar dados para inserção/atualização
    const webhookData = {
      external_id: invoice.external_id,
      invoice_id: invoice.id?.toString(),
      token: invoice.token,
      status_code: statusCode,
      status_name: status.text,
      status_title: status.title,
      status_description: status.description,
      status_text: status.text,
      amount: prices.total || 0,
      payment_date: payment.payDate ? new Date(payment.payDate).toISOString() : null,
      payment_due: payment.due ? new Date(payment.due).toISOString() : null,
      payment_gateway: payment.gateway || "SuperPay",
      qr_code: payment.details?.qrcode || null,
      webhook_data: body,
      gateway: "superpaybr",
      ...statusFlags,
    }

    console.log("💾 Dados para salvar:", {
      external_id: webhookData.external_id,
      status_code: webhookData.status_code,
      amount: webhookData.amount,
      is_paid: webhookData.is_paid,
    })

    // Inserir ou atualizar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ Erro no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro de banco de dados",
          message: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    console.log("✅ Webhook salvo com sucesso:", data)

    // Log especial para pagamentos confirmados
    if (statusFlags.is_paid) {
      console.log("🎉 PAGAMENTO CONFIRMADO!")
      console.log(`💰 Valor: R$ ${webhookData.amount}`)
      console.log(`🆔 External ID: ${webhookData.external_id}`)
      console.log("🔄 Cliente será redirecionado para /upp/001")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id: webhookData.external_id,
        status_code: webhookData.status_code,
        is_paid: webhookData.is_paid,
        amount: webhookData.amount,
      },
    })
  } catch (error) {
    console.error("💥 Erro no webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "SuperPay Webhook Endpoint",
    status: "active",
    timestamp: new Date().toISOString(),
  })
}
