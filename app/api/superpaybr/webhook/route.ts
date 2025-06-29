import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória (igual TryploPay)
export const paymentConfirmations = new Map<string, any>()

// Interface para webhook SuperPayBR
interface SuperPayBRWebhookPayload {
  event: {
    type: string
    date: string
  }
  invoices: {
    id: string
    invoice_id: string
    external_id: string
    token: string
    status: {
      code: number
      title: string
      text: string
      description: string
    }
    prices: {
      total: number
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
      payDate?: string
      details?: {
        pix_code?: string
        qrcode?: string
        url?: string
      }
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
  3: {
    name: "Processando",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  4: {
    name: "Aprovado",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  5: {
    name: "Pago",
    isPaid: true,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  6: {
    name: "Cancelado",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: true,
  },
  7: {
    name: "Negado",
    isPaid: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  8: {
    name: "Estornado",
    isPaid: false,
    isDenied: false,
    isRefunded: true,
    isExpired: false,
    isCanceled: false,
  },
  9: {
    name: "Vencido",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: true,
    isCanceled: false,
  },
  10: {
    name: "Contestado",
    isPaid: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  11: {
    name: "Chargeback",
    isPaid: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  12: {
    name: "Negado",
    isPaid: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  13: {
    name: "Pendente",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
  14: {
    name: "Expirado",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: true,
    isCanceled: false,
  },
  15: {
    name: "Vencido",
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: true,
    isCanceled: false,
  },
  16: {
    name: "Falha",
    isPaid: false,
    isDenied: true,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
  },
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const payload: SuperPayBRWebhookPayload = await request.json()
    console.log("📥 Payload completo:", JSON.stringify(payload, null, 2))

    // Verificar se é um evento de atualização de fatura
    if (payload.event?.type !== "invoice.update") {
      console.log("ℹ️ Evento ignorado:", payload.event?.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const invoice = payload.invoices
    if (!invoice) {
      console.log("⚠️ Webhook SuperPayBR sem dados de fatura")
      return NextResponse.json({ success: true, message: "Webhook recebido mas sem dados de fatura" })
    }

    const externalId = invoice.external_id
    const invoiceId = invoice.invoice_id || invoice.id
    const token = invoice.token
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const statusDescription = invoice.status.description
    const amount = (invoice.prices?.total || invoice.valores?.bruto || 0) / 100 // SuperPayBR usa centavos

    console.log("📊 Dados do webhook SuperPayBR:")
    console.log(`External ID: ${externalId}`)
    console.log(`Invoice ID: ${invoiceId}`)
    console.log(`Token: ${token}`)
    console.log(`Status Code: ${statusCode}`)
    console.log(`Status Title: ${statusTitle}`)
    console.log(`Valor: R$ ${amount.toFixed(2)}`)
    console.log(`Cliente: ${invoice.client?.name || "N/A"}`)

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
      statusDescription: statusDescription,
      amount: amount,
      paymentDate: statusInfo.isPaid ? invoice.payment?.payDate || new Date().toISOString() : null,
      timestamp: new Date().toISOString(),
      externalId: externalId,
      invoiceId: invoiceId,
      token: token,
      clientName: invoice.client?.name || "",
      clientDocument: invoice.client?.document || "",
      clientEmail: invoice.client?.email || "",
      paymentDetails: invoice.payment,
      webhookData: payload,
      provider: "superpaybr",
    }

    console.log("💾 Salvando confirmação SuperPayBR em memória...")

    // Salvar em memória global (igual TryploPay)
    paymentConfirmations.set(externalId, webhookPaymentData)
    paymentConfirmations.set(invoiceId, webhookPaymentData)
    paymentConfirmations.set(token, webhookPaymentData)
    paymentConfirmations.set(`token_${token}`, webhookPaymentData)

    console.log(`✅ Confirmação SuperPayBR salva para: ${externalId}`)
    console.log(`📊 Total de confirmações em memória: ${paymentConfirmations.size}`)

    // Backup no Supabase (igual TryploPay)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { error: supabaseError } = await supabase.from("payment_webhooks").upsert(
        {
          external_id: externalId,
          invoice_id: invoiceId,
          token: token,
          status_code: statusCode,
          status_name: statusInfo.name,
          status_description: statusDescription,
          amount: amount,
          payment_date: webhookPaymentData.paymentDate,
          is_paid: statusInfo.isPaid,
          is_denied: statusInfo.isDenied,
          is_refunded: statusInfo.isRefunded,
          is_expired: statusInfo.isExpired,
          is_canceled: statusInfo.isCanceled,
          webhook_data: payload,
          received_at: new Date().toISOString(),
          provider: "superpaybr",
        },
        {
          onConflict: "external_id",
        },
      )

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
      invoice_id: invoiceId,
      status: statusInfo.name,
      status_code: statusCode,
      is_paid: statusInfo.isPaid,
      amount: amount,
      processed_at: new Date().toISOString(),
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
