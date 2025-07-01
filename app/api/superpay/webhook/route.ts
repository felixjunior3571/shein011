import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPay recebido")

    const body = await request.json()
    console.log("📦 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook
    const invoice = body.invoices
    if (!invoice) {
      console.log("❌ Webhook sem dados de invoice")
      return NextResponse.json({ error: "No invoice data" }, { status: 400 })
    }

    const externalId = invoice.external_id
    const statusCode = invoice.status?.code || 1
    const amount = invoice.prices?.total || 0
    const customerId = invoice.customer?.toString() || null

    console.log("🎯 Processando webhook:", {
      externalId,
      statusCode,
      amount,
      customerId,
    })

    // Determinar se está pago
    const isPaid = statusCode === 5
    const statusName = isPaid ? "paid" : "pending"
    const statusText = invoice.status?.text || (isPaid ? "approved" : "pending")

    // Inserir/atualizar no banco
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(
        {
          external_id: externalId,
          invoice_id: invoice.id?.toString(),
          gateway: "superpay",
          status_code: statusCode,
          status_name: statusName,
          status_title: invoice.status?.title || (isPaid ? "Pagamento Confirmado!" : "Aguardando Pagamento"),
          status_description:
            invoice.status?.description || (isPaid ? "Obrigado pela sua Compra!" : "Aguardando confirmação"),
          status_text: statusText,
          amount: amount,
          discount: invoice.prices?.discount || 0,
          taxes: invoice.prices?.taxs?.others || 0,
          payment_type: invoice.type || "PIX",
          payment_gateway: invoice.payment?.gateway || "SuperPay",
          payment_date: invoice.payment?.date ? new Date(invoice.payment.date).toISOString() : null,
          payment_due: invoice.payment?.due ? new Date(invoice.payment.due).toISOString() : null,
          qr_code: invoice.payment?.details?.qrcode || null,
          pix_code: invoice.payment?.details?.pix_code || null,
          barcode: invoice.payment?.details?.barcode || null,
          payment_url: invoice.payment?.details?.url || null,
          is_paid: isPaid,
          is_denied: statusCode === 3,
          is_expired: statusCode === 4,
          is_canceled: statusCode === 6,
          is_refunded: statusCode === 7,
          customer_id: customerId,
          event_type: body.event?.type || "webhook.update",
          event_date: body.event?.date ? new Date(body.event.date).toISOString() : new Date().toISOString(),
          webhook_data: body,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id,gateway",
        },
      )
      .select()

    if (error) {
      console.error("❌ Erro ao salvar webhook:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ Webhook processado com sucesso:", data)

    // Se o pagamento foi confirmado, log especial
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO!")
      console.log("💰 Valor:", amount)
      console.log("🆔 External ID:", externalId)
      console.log("👤 Customer ID:", customerId)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: data?.[0],
    })
  } catch (error) {
    console.error("💥 Erro no webhook SuperPay:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
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
