import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cache global para confirmações de pagamento
export const globalPaymentConfirmations = new Map<string, any>()

// Cliente Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Payload recebido:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook
    if (!body.invoices || !body.invoices.external_id) {
      console.log("❌ Webhook inválido: estrutura incorreta")
      return NextResponse.json({ success: false, error: "Invalid webhook structure" }, { status: 400 })
    }

    const invoice = body.invoices
    const externalId = invoice.external_id
    const statusCode = invoice.status?.code || 1
    const statusTitle = invoice.status?.title || "Desconhecido"

    console.log(`📋 Processando webhook para: ${externalId}`)
    console.log(`📊 Status: ${statusCode} - ${statusTitle}`)

    // Mapear status SuperPayBR
    const isPaid = statusCode === 5
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9

    // Dados processados
    const processedData = {
      isPaid,
      isDenied,
      isExpired,
      isCanceled,
      isRefunded,
      statusCode,
      statusName: statusTitle,
      amount: (invoice.prices?.total || 0) / 100,
      paymentDate: invoice.payment?.payDate || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      externalId,
      invoiceId: invoice.id,
      rawWebhook: body,
    }

    // Salvar no cache global
    globalPaymentConfirmations.set(externalId, processedData)
    console.log(`💾 Dados salvos no cache global: ${externalId}`)

    // Salvar no Supabase
    try {
      const { error: supabaseError } = await supabase.from("payment_webhooks").upsert({
        external_id: externalId,
        invoice_id: invoice.id,
        status_code: statusCode,
        status_name: statusTitle,
        amount: processedData.amount,
        is_paid: isPaid,
        is_denied: isDenied,
        is_expired: isExpired,
        is_canceled: isCanceled,
        is_refunded: isRefunded,
        payment_date: processedData.paymentDate,
        raw_webhook: body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (supabaseError) {
        console.log("⚠️ Erro ao salvar no Supabase:", supabaseError)
      } else {
        console.log("✅ Webhook salvo no Supabase")
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro de conexão Supabase:", supabaseError)
    }

    // Log de status críticos
    if (isPaid) {
      console.log(`🎉 PAGAMENTO CONFIRMADO: ${externalId} - R$ ${processedData.amount}`)
    } else if (isDenied) {
      console.log(`❌ PAGAMENTO NEGADO: ${externalId}`)
    } else if (isExpired) {
      console.log(`⏰ PAGAMENTO EXPIRADO: ${externalId}`)
    } else if (isCanceled) {
      console.log(`🚫 PAGAMENTO CANCELADO: ${externalId}`)
    } else if (isRefunded) {
      console.log(`💸 PAGAMENTO ESTORNADO: ${externalId}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      externalId,
      status: statusTitle,
      processed: processedData,
    })
  } catch (error) {
    console.log("❌ Erro no processamento do webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    cached_confirmations: globalPaymentConfirmations.size,
  })
}
