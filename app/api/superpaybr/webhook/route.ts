import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// ⚠️ ARMAZENAMENTO GLOBAL EM MEMÓRIA PARA WEBHOOK
const paymentConfirmations = new Map<string, any>()
const realtimeEvents: any[] = []

// Interface do payload SuperPayBR
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

  // Salvar com múltiplas chaves para facilitar consulta
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId, confirmationData)
  paymentConfirmations.set(`token_${data.token}`, confirmationData)

  // Adicionar aos eventos em tempo real
  realtimeEvents.push({
    type: "payment_update",
    data: confirmationData,
    timestamp: new Date().toISOString(),
  })

  // Manter apenas os últimos 1000 eventos
  if (realtimeEvents.length > 1000) {
    realtimeEvents.shift()
  }

  console.log("💾 Confirmação salva em memória global:", {
    externalId,
    invoiceId,
    isPaid: confirmationData.isPaid,
    statusCode: confirmationData.statusCode,
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO 🔔")

    const payload: SuperPayWebhookPayload = await request.json()
    console.log("📋 Payload completo:", JSON.stringify(payload, null, 2))

    // ✅ Verificar se é um evento de atualização de fatura
    if (payload.event?.type !== "invoice.update") {
      console.log("ℹ️ Evento ignorado:", payload.event?.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const invoice = payload.invoices
    if (!invoice) {
      console.log("❌ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados da fatura não encontrados" }, { status: 400 })
    }

    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const token = invoice.token
    const statusCode = invoice.status?.code
    const statusTitle = invoice.status?.title
    const statusDescription = invoice.status?.description
    const amount = invoice.prices?.total || 0

    // ✅ LOGS PARA DEBUG
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO 🔔")
    console.log(`Status Code: ${statusCode}`)
    console.log(`External ID: ${externalId}`)
    console.log(`Valor: R$ ${amount.toFixed(2)}`)
    console.log(`Status: ${statusTitle}`)

    // ✅ MAPEAR STATUS OFICIAIS SUPERPAYBR (1 a 16)
    let isPaid = false
    let isDenied = false
    let isExpired = false
    let isCanceled = false
    let isRefunded = false

    switch (statusCode) {
      case 5: // Pago
        isPaid = true
        console.log("🎉 PAGAMENTO CONFIRMADO SUPERPAYBR!")
        break
      case 6: // Cancelado
        isCanceled = true
        console.log("🚫 PAGAMENTO CANCELADO SUPERPAYBR!")
        break
      case 9: // Estornado
        isRefunded = true
        console.log("↩️ PAGAMENTO ESTORNADO SUPERPAYBR!")
        break
      case 12: // Negado
        isDenied = true
        console.log("❌ PAGAMENTO NEGADO SUPERPAYBR!")
        break
      case 15: // Vencido
        isExpired = true
        console.log("⏰ PAGAMENTO VENCIDO SUPERPAYBR!")
        break
      default:
        console.log(`ℹ️ Status SuperPayBR não processado: ${statusCode} - ${statusTitle}`)
    }

    // ✅ PREPARAR DADOS PARA ARMAZENAMENTO
    const webhookPaymentData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName: statusTitle,
      statusDescription,
      amount,
      paymentDate: isPaid ? invoice.payment?.payDate || new Date().toISOString() : null,
      token,
      invoiceId,
      externalId,
      paymentDetails: invoice.payment,
      webhookData: payload,
      provider: "superpaybr",
    }

    // ✅ ARMAZENAR CONFIRMAÇÕES EM MEMÓRIA GLOBAL
    savePaymentConfirmation(externalId, invoiceId, webhookPaymentData)

    // ✅ SALVAR NO SUPABASE (backup)
    try {
      const { error } = await supabase.from("payment_webhooks").upsert(
        {
          external_id: externalId,
          payment_data: webhookPaymentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )

      if (error) {
        console.error("❌ Erro ao salvar no Supabase:", error)
      } else {
        console.log("✅ Backup salvo no Supabase com sucesso!")
      }
    } catch (supabaseError) {
      console.error("❌ Erro no Supabase:", supabaseError)
    }

    // ✅ LOGS COMPLETOS PARA DEBUG
    console.log("📊 RESUMO DO WEBHOOK:")
    console.log(`- External ID: ${externalId}`)
    console.log(`- Invoice ID: ${invoiceId}`)
    console.log(`- Token: ${token}`)
    console.log(`- Status Code: ${statusCode}`)
    console.log(`- Status Name: ${statusTitle}`)
    console.log(`- Valor: R$ ${amount}`)
    console.log(`- Pago: ${isPaid}`)
    console.log(`- Negado: ${isDenied}`)
    console.log(`- Vencido: ${isExpired}`)
    console.log(`- Cancelado: ${isCanceled}`)
    console.log(`- Estornado: ${isRefunded}`)

    // ✅ RESPOSTA 200 OK PARA A SUPERPAYBR
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status: statusTitle,
        status_code: statusCode,
        is_paid: isPaid,
        amount: amount,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ ERRO AO PROCESSAR WEBHOOK SUPERPAYBR:", error)

    // ✅ SEMPRE RETORNAR 200 OK PARA NÃO AFETAR O WEBHOOK
    return NextResponse.json({
      success: true,
      message: "Webhook processado com erro interno",
      error: error instanceof Error ? error.message : "Erro desconhecido",
      processed_at: new Date().toISOString(),
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
    confirmations_count: paymentConfirmations.size,
    events_count: realtimeEvents.length,
  })
}

// ✅ ENDPOINT PARA CONSULTAR CONFIRMAÇÕES (SEM RATE LIMIT)
export { paymentConfirmations, realtimeEvents }
