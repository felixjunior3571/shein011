import { type NextRequest, NextResponse } from "next/server"
import { savePaymentConfirmation, type TryploPayWebhookPayload } from "@/lib/payment-storage"

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK TRYPLOPAY RECEBIDO ===")

    const payload: TryploPayWebhookPayload = await request.json()
    console.log("📥 Payload recebido:", JSON.stringify(payload, null, 2))

    // Extrair dados do webhook TryploPay
    const invoice = payload.invoices
    const externalId = invoice.external_id
    const invoiceId = invoice.id.toString()
    const token = invoice.token
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const statusDescription = invoice.status.description
    const amount = invoice.prices.total / 100 // TryploPay envia em centavos
    const paymentDate = invoice.payment?.payDate || null

    console.log("📊 Dados extraídos:")
    console.log(`External ID: ${externalId}`)
    console.log(`Invoice ID: ${invoiceId}`)
    console.log(`Status Code: ${statusCode}`)
    console.log(`Status: ${statusTitle}`)
    console.log(`Valor: R$ ${amount.toFixed(2)}`)
    console.log(`Data Pagamento: ${paymentDate || "N/A"}`)

    // Salvar confirmação no armazenamento global
    const confirmationData = savePaymentConfirmation(externalId, invoiceId, token, {
      statusCode,
      statusDescription,
      amount,
      paymentDate,
      rawPayload: payload,
    })

    console.log("💾 Confirmação salva:", {
      externalId: confirmationData.externalId,
      isPaid: confirmationData.isPaid,
      statusName: confirmationData.statusName,
    })

    // Salvar também no Supabase como backup
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { error } = await supabase.from("payment_webhooks").insert({
        external_id: externalId,
        invoice_id: invoiceId,
        token: token,
        status_code: statusCode,
        status_name: statusTitle,
        status_description: statusDescription,
        amount: amount,
        payment_date: paymentDate,
        is_paid: confirmationData.isPaid,
        is_denied: confirmationData.isDenied,
        is_refunded: confirmationData.isRefunded,
        is_expired: confirmationData.isExpired,
        is_canceled: confirmationData.isCanceled,
        raw_data: payload,
        received_at: new Date().toISOString(),
      })

      if (error) {
        console.error("❌ Erro ao salvar no Supabase:", error)
      } else {
        console.log("✅ Webhook salvo no Supabase")
      }
    } catch (dbError) {
      console.error("❌ Erro de conexão com Supabase:", dbError)
    }

    // Sempre retornar 200 OK para o webhook
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("❌ Erro no processamento do webhook TryploPay:", error)

    // Mesmo com erro, retornar 200 para não reenviar o webhook
    return NextResponse.json({ received: true, error: "processed" }, { status: 200 })
  }
}
