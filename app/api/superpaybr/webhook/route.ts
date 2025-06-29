import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Inicializar Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface SuperPayBRWebhookData {
  event: {
    type: string
    date: string
  }
  invoices: {
    id: string
    external_id: string
    token: string
    date: string
    status: {
      code: number
      title: string
      description: string
    }
    customer: string
    prices: {
      total: number
      discount: number
      taxs: {
        others: any
      }
      refound: any
    }
    type: string
    payment: {
      gateway: string
      date: string | null
      due: string
      card: any
      payId: string
      payDate: string
      details: {
        barcode: string | null
        pix_code: string
        qrcode: string
        url: string
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO!")

    // Obter dados do webhook
    const webhookData: SuperPayBRWebhookData = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(webhookData, null, 2))

    const { event, invoices } = webhookData

    // Validar se é um evento de atualização de fatura
    if (event.type !== "invoice.update") {
      console.log("⚠️ Evento ignorado:", event.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const externalId = invoices.external_id
    const statusCode = invoices.status.code
    const statusTitle = invoices.status.title
    const amount = invoices.prices.total / 100 // SuperPayBR usa centavos
    const paymentDate = invoices.payment.payDate

    console.log(`🎯 Processando pagamento: ${externalId} - Status: ${statusCode} (${statusTitle})`)

    // Mapear status da SuperPayBR
    const paymentStatus = {
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode,
      statusName: statusTitle,
      amount,
      paymentDate,
    }

    switch (statusCode) {
      case 5: // Pagamento Confirmado
        paymentStatus.isPaid = true
        console.log("✅ PAGAMENTO CONFIRMADO!")
        break
      case 12: // Pagamento Negado
        paymentStatus.isDenied = true
        console.log("❌ PAGAMENTO NEGADO!")
        break
      case 15: // Pagamento Vencido
        paymentStatus.isExpired = true
        console.log("⏰ PAGAMENTO VENCIDO!")
        break
      case 6: // Cancelado
        paymentStatus.isCanceled = true
        console.log("🚫 PAGAMENTO CANCELADO!")
        break
      case 9: // Estornado
        paymentStatus.isRefunded = true
        console.log("↩️ PAGAMENTO ESTORNADO!")
        break
      default:
        console.log(`ℹ️ Status intermediário: ${statusCode} - ${statusTitle}`)
    }

    // Salvar no localStorage via broadcast (para clientes conectados)
    const webhookPayload = {
      type: "SUPERPAYBR_WEBHOOK",
      externalId,
      paymentStatus,
      timestamp: new Date().toISOString(),
    }

    // Salvar no Supabase para persistência
    try {
      const { error: supabaseError } = await supabase.from("payment_webhooks").insert({
        external_id: externalId,
        provider: "superpaybr",
        status_code: statusCode,
        status_name: statusTitle,
        amount,
        payment_date: paymentDate,
        is_paid: paymentStatus.isPaid,
        is_denied: paymentStatus.isDenied,
        is_refunded: paymentStatus.isRefunded,
        is_expired: paymentStatus.isExpired,
        is_canceled: paymentStatus.isCanceled,
        raw_data: webhookData,
        created_at: new Date().toISOString(),
      })

      if (supabaseError) {
        console.log("⚠️ Erro ao salvar no Supabase:", supabaseError)
      } else {
        console.log("💾 Webhook salvo no Supabase com sucesso!")
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro no Supabase:", supabaseError)
    }

    // Broadcast para clientes conectados (se houver WebSocket ou Server-Sent Events)
    console.log("📡 Broadcasting webhook data:", webhookPayload)

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      status: paymentStatus,
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook",
      },
      { status: 500 },
    )
  }
}

// Método GET para validação de webhook (conforme documentação)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPayBR endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
