import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Armazenamento global em memória (igual TryploPay)
export const paymentConfirmations = new Map<string, any>()

// Interface para webhook SuperPayBR
interface SuperPayBRWebhookPayload {
  invoices: {
    id: string
    invoice_id: string
    external_id: string
    status: {
      code: number
      title: string
      text: string
    }
    valores: {
      bruto: number
      liquido: number
    }
    client: {
      name: string
      document: string
      email: string
    }
    payment: {
      type: string
      due_at: string
    }
  }
}

// Mapeamento de status codes SuperPayBR (igual TryploPay)
const statusCodeMapping = {
  1: {
    name: "Aguardando Pagamento",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  2: {
    name: "Em Processamento",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  3: { name: "Processando", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false },
  4: { name: "Aprovado", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false },
  5: { name: "Pago", isPaid: true, isDenied: false, isRefunded: false, isExpired: false, isCanceled: false },
  6: { name: "Cancelado", isPaid: false, isDenied: false, isRefunded: false, isExpired: false, isCanceled: true },
  7: { name: "Negado", isPaid: false, isDenied: true, isRefunded: false, isExpired: false, isCanceled: false },
  8: { name: "Estornado", isPaid: false, isDenied: false, isRefunded: true, isExpired: false, isCanceled: false },
  9: { name: "Vencido", isPaid: false, isDenied: false, isRefunded: false, isExpired: true, isCanceled: false },
  10: { name: "Contestado", isPaid: false, isDenied: true, isRefunded: false, isExpired: false, isCanceled: false },
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const payload: SuperPayBRWebhookPayload = await request.json()
    console.log("📥 Payload completo:", JSON.stringify(payload, null, 2))

    const invoice = payload.invoices
    if (!invoice) {
      console.log("⚠️ Webhook SuperPayBR sem dados de fatura")
      return NextResponse.json({ success: true, message: "Webhook recebido mas sem dados de fatura" })
    }

    const externalId = invoice.external_id
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const amount = invoice.valores.bruto / 100 // SuperPayBR usa centavos

    console.log("📊 Dados do webhook SuperPayBR:")
    console.log(`External ID: ${externalId}`)
    console.log(`Status Code: ${statusCode}`)
    console.log(`Status Title: ${statusTitle}`)
    console.log(`Valor: R$ ${amount.toFixed(2)}`)
    console.log(`Cliente: ${invoice.client.name}`)

    // Mapear status code
    const statusInfo = statusCodeMapping[statusCode as keyof typeof statusCodeMapping] || {
      name: statusTitle || "Status Desconhecido",
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
    }

    // Preparar dados do pagamento (formato TryploPay)
    const webhookPaymentData = {
      isPaid: statusInfo.isPaid,
      isDenied: statusInfo.isDenied,
      isRefunded: statusInfo.isRefunded,
      isExpired: statusInfo.isExpired,
      isCanceled: statusInfo.isCanceled,
      statusCode: statusCode,
      statusName: statusInfo.name,
      amount: amount,
      paymentDate: statusInfo.isPaid ? new Date().toISOString() : null,
      timestamp: new Date().toISOString(),
      externalId: externalId,
      invoiceId: invoice.invoice_id,
      clientName: invoice.client.name,
      clientDocument: invoice.client.document,
      clientEmail: invoice.client.email,
    }

    console.log("💾 Salvando confirmação SuperPayBR em memória...")

    // Salvar em memória global (igual TryploPay)
    paymentConfirmations.set(externalId, webhookPaymentData)
    paymentConfirmations.set(invoice.invoice_id, webhookPaymentData)
    paymentConfirmations.set(invoice.id, webhookPaymentData)

    console.log(`✅ Confirmação SuperPayBR salva para: ${externalId}`)
    console.log(`📊 Total de confirmações em memória: ${paymentConfirmations.size}`)

    // Backup no Supabase
    try {
      const { error: supabaseError } = await supabase.from("superpaybr_webhooks").upsert({
        external_id: externalId,
        invoice_id: invoice.invoice_id,
        status_code: statusCode,
        status_name: statusInfo.name,
        amount: amount,
        payment_data: webhookPaymentData,
        webhook_payload: payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (supabaseError) {
        console.log("⚠️ Erro ao salvar no Supabase SuperPayBR:", supabaseError)
      } else {
        console.log("✅ Backup SuperPayBR salvo no Supabase")
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro no backup Supabase SuperPayBR:", supabaseError)
    }

    // Log do status
    if (statusInfo.isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    } else if (statusInfo.isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
    } else {
      console.log("ℹ️ Status SuperPayBR atualizado:", statusInfo.name)
    }

    // SEMPRE retornar 200 OK (igual TryploPay)
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      external_id: externalId,
      status: statusInfo.name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)

    // SEMPRE retornar 200 OK mesmo com erro (igual TryploPay)
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR recebido com erro",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      timestamp: new Date().toISOString(),
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
    confirmations_count: paymentConfirmations.size,
    recent_confirmations: Array.from(paymentConfirmations.entries())
      .slice(-5)
      .map(([key, value]) => ({
        external_id: key,
        status: value.statusName,
        amount: value.amount,
        timestamp: value.timestamp,
      })),
  })
}
