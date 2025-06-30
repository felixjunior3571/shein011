import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// SuperPay Status Codes baseado na documentação oficial
const SUPERPAY_STATUS_CODES = {
  1: {
    name: "Aguardando Pagamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  2: {
    name: "Em Processamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  3: { name: "Processando", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  4: { name: "Aprovado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
  7: { name: "Contestado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  8: { name: "Chargeback", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
  10: { name: "Falha", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  11: { name: "Bloqueado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  12: { name: "Negado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  13: { name: "Análise", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  14: {
    name: "Análise Manual",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  15: { name: "Vencido", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
} as const

// Interface para o payload do webhook SuperPay
interface SuperPayWebhookPayload {
  event: {
    type: string
    date: string
  }
  invoices: {
    id: string
    external_id: string
    token: string | null
    date: string
    status: {
      code: number
      title: string
      description: string
      text: string
    }
    customer: number
    prices: {
      total: number
      discount: number
      taxs: {
        others: number
      }
      refound: number | null
    }
    type: string
    payment: {
      gateway: string
      date: string
      due: string
      card: any | null
      payId: string | null
      payDate: string
      details: {
        barcode: string | null
        pix_code: string | null
        qrcode: string
        url: string | null
      }
    }
  }
}

function generateSuperPayToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_${timestamp}_${random}`
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPay recebido")

    const body = await request.json()
    console.log("📥 Payload SuperPay:", JSON.stringify(body, null, 2))

    // Validar estrutura básica do payload
    if (!body.event || !body.invoices) {
      console.error("❌ Payload SuperPay inválido - estrutura incorreta")
      return NextResponse.json(
        {
          success: false,
          error: "Payload inválido - estrutura incorreta",
        },
        { status: 400 },
      )
    }

    const invoice = body.invoices
    const statusCode = invoice.status?.code
    const statusInfo =
      SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]

    // Gerar token único com expiração de 15 minutos
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    const token = generateSuperPayToken()

    // Dados para salvar no Supabase
    const webhookData = {
      external_id: invoice.external_id,
      invoice_id: invoice.id,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: invoice.prices?.total || 0,
      payment_date: invoice.payment?.payDate || null,
      processed_at: now.toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
      token: token,
      expires_at: expiresAt.toISOString(),
      webhook_data: body,
    }

    console.log("💾 Salvando webhook SuperPay no Supabase:", {
      external_id: webhookData.external_id,
      status: webhookData.status_name,
      amount: webhookData.amount,
      token: webhookData.token,
    })

    // Salvar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
        onConflict: "external_id,gateway",
      })
      .select()

    if (error) {
      console.error("❌ Erro ao salvar webhook SuperPay no Supabase:", error)
      throw error
    }

    console.log("✅ Webhook SuperPay salvo no Supabase:", {
      id: data?.[0]?.id,
      external_id: webhookData.external_id,
      status: webhookData.status_name,
      token: webhookData.token,
    })

    // Log do status crítico
    if (statusInfo.isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO SuperPay:", {
        external_id: invoice.external_id,
        amount: invoice.prices?.total,
        payment_date: invoice.payment?.payDate,
      })
    } else if (statusInfo.isDenied) {
      console.log("❌ PAGAMENTO NEGADO SuperPay:", {
        external_id: invoice.external_id,
        status: statusInfo.name,
      })
    } else if (statusInfo.isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO SuperPay:", {
        external_id: invoice.external_id,
        status: statusInfo.name,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id: invoice.external_id,
        status: statusInfo.name,
        token: token,
        expires_at: expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPay:", error)

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

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint webhook SuperPay ativo",
    timestamp: new Date().toISOString(),
  })
}
