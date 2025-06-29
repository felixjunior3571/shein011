import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// ✅ INTERFACE DO PAYLOAD SUPERPAYBR
interface SuperPayWebhookPayload {
  event: {
    type: "invoice.update"
    date: string
  }
  invoices: {
    id: string
    external_id: string
    token: string
    status: {
      code: number
      title: string
      description: string
    }
    prices: {
      total: number
    }
    type: "PIX" | "BOLETO" | "CARD"
    payment: {
      gateway: string
      payId: string
      payDate: string
      due: string
      details: {
        pix_code: string
        qrcode: string
        url: string
      }
    }
  }
}

// ✅ ARMAZENAMENTO GLOBAL EM MEMÓRIA
const paymentConfirmations = new Map<string, any>()
const realtimeEvents: any[] = []

function savePaymentConfirmation(externalId: string, invoiceId: string, data: any) {
  const confirmationData = {
    externalId,
    invoiceId,
    isPaid: data.statusCode === 5,
    isRefunded: data.statusCode === 9,
    isDenied: data.statusCode === 12,
    isExpired: data.statusCode === 15,
    isCanceled: data.statusCode === 6,
    amount: data.amount,
    paymentDate: data.paymentDate,
    statusCode: data.statusCode,
    statusName: data.statusName,
    token: data.token,
    timestamp: new Date().toISOString(),
  }

  // Salvar com múltiplas chaves
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId, confirmationData)
  paymentConfirmations.set(`token_${data.token}`, confirmationData)

  // Adicionar aos eventos em tempo real
  realtimeEvents.push({
    ...confirmationData,
    event_type: "payment_update",
    received_at: new Date().toISOString(),
  })

  // Manter apenas os últimos 1000 eventos
  if (realtimeEvents.length > 1000) {
    realtimeEvents.splice(0, realtimeEvents.length - 1000)
  }

  console.log(`💾 Confirmação salva para: ${externalId} (Status: ${data.statusName})`)
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAY RECEBIDO 🔔")

    const payload: SuperPayWebhookPayload = await request.json()

    console.log(`📋 Tipo do evento: ${payload.event.type}`)
    console.log(`📅 Data do evento: ${payload.event.date}`)
    console.log(`🆔 Invoice ID: ${payload.invoices.id}`)
    console.log(`🔑 External ID: ${payload.invoices.external_id}`)
    console.log(`🏷️ Token: ${payload.invoices.token}`)
    console.log(`📊 Status Code: ${payload.invoices.status.code}`)
    console.log(`📝 Status: ${payload.invoices.status.title}`)
    console.log(`💰 Valor: R$ ${payload.invoices.prices.total.toFixed(2)}`)
    console.log(`💳 Tipo: ${payload.invoices.type}`)

    // ✅ MAPEAR STATUS CODES SUPERPAY
    const statusCode = payload.invoices.status.code
    const statusName = payload.invoices.status.title

    let statusDescription = ""
    switch (statusCode) {
      case 5:
        statusDescription = "✅ PAGAMENTO CONFIRMADO!"
        break
      case 6:
        statusDescription = "🚫 PAGAMENTO CANCELADO"
        break
      case 9:
        statusDescription = "↩️ PAGAMENTO ESTORNADO"
        break
      case 12:
        statusDescription = "❌ PAGAMENTO NEGADO"
        break
      case 15:
        statusDescription = "⏰ PAGAMENTO VENCIDO"
        break
      default:
        statusDescription = `📋 Status: ${statusName}`
    }

    console.log(`🎯 ${statusDescription}`)

    // ✅ SALVAR CONFIRMAÇÃO EM MEMÓRIA GLOBAL
    const confirmationData = {
      statusCode,
      statusName,
      amount: payload.invoices.prices.total,
      paymentDate: payload.invoices.payment?.payDate || new Date().toISOString(),
      token: payload.invoices.token,
      gateway: payload.invoices.payment?.gateway || "SuperPayBR",
      payId: payload.invoices.payment?.payId || "",
      type: payload.invoices.type,
    }

    savePaymentConfirmation(payload.invoices.external_id, payload.invoices.id, confirmationData)

    // ✅ BACKUP NO SUPABASE (OPCIONAL)
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

        await supabase.from("superpaybr_webhooks").insert({
          external_id: payload.invoices.external_id,
          invoice_id: payload.invoices.id,
          token: payload.invoices.token,
          status_code: statusCode,
          status_name: statusName,
          amount: payload.invoices.prices.total,
          payment_date: confirmationData.paymentDate,
          webhook_payload: payload,
          processed_at: new Date().toISOString(),
        })

        console.log("💾 Webhook salvo no Supabase")
      }
    } catch (supabaseError) {
      console.error("⚠️ Erro ao salvar no Supabase:", supabaseError)
      // Não falhar o webhook por causa do Supabase
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    // ✅ RESPOSTA 200 OK PARA A SUPERPAYBR
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: payload.invoices.external_id,
      status_code: statusCode,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)

    // ✅ SEMPRE RETORNAR 200 PARA NÃO AFETAR O SUPERPAYBR
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
      processed_at: new Date().toISOString(),
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    total_confirmations: paymentConfirmations.size,
    total_events: realtimeEvents.length,
    timestamp: new Date().toISOString(),
  })
}
