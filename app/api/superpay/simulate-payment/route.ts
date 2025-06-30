import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// SuperPay Status Codes
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

function generateSuperPayToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_${timestamp}_${random}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { externalId, amount = 34.9, statusCode = 5 } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "externalId é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🧪 Simulando pagamento SuperPay:", {
      externalId,
      amount,
      statusCode,
    })

    const statusInfo =
      SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[5]

    // Gerar token único com expiração de 15 minutos
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    const token = generateSuperPayToken()

    // Simular payload do webhook SuperPay
    const simulatedWebhook = {
      event: {
        type: "invoice.status_changed",
        date: now.toISOString(),
      },
      invoices: {
        id: `INV_${Date.now()}`,
        external_id: externalId,
        token: token,
        date: now.toISOString(),
        status: {
          code: statusCode,
          title: statusInfo.name,
          description: `Pagamento ${statusInfo.name.toLowerCase()}`,
          text: statusInfo.name,
        },
        customer: 12345,
        prices: {
          total: amount,
          discount: 0,
          taxs: {
            others: 0,
          },
          refound: null,
        },
        type: "pix",
        payment: {
          gateway: "superpay",
          date: now.toISOString(),
          due: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: `PAY_${Date.now()}`,
          payDate: statusInfo.isPaid ? now.toISOString() : "",
          details: {
            barcode: null,
            pix_code: "00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426614174000",
            qrcode: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            url: null,
          },
        },
      },
    }

    // Dados para salvar no Supabase
    const webhookData = {
      external_id: externalId,
      invoice_id: simulatedWebhook.invoices.id,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      payment_date: statusInfo.isPaid ? now.toISOString() : null,
      processed_at: now.toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
      token: token,
      expires_at: expiresAt.toISOString(),
      webhook_data: simulatedWebhook,
    }

    console.log("💾 Salvando simulação SuperPay no Supabase:", {
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
      console.error("❌ Erro ao salvar simulação SuperPay no Supabase:", error)
      throw error
    }

    console.log("✅ Simulação SuperPay salva no Supabase:", {
      id: data?.[0]?.id,
      external_id: webhookData.external_id,
      status: webhookData.status_name,
      token: webhookData.token,
    })

    // Log do status simulado
    if (statusInfo.isPaid) {
      console.log("🎉 PAGAMENTO SIMULADO CONFIRMADO SuperPay:", {
        external_id: externalId,
        amount: amount,
        payment_date: now.toISOString(),
      })
    } else if (statusInfo.isDenied) {
      console.log("❌ PAGAMENTO SIMULADO NEGADO SuperPay:", {
        external_id: externalId,
        status: statusInfo.name,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      data: {
        external_id: externalId,
        status: statusInfo.name,
        amount: amount,
        token: token,
        expires_at: expiresAt.toISOString(),
        webhook_data: simulatedWebhook,
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

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
    message: "Endpoint de simulação SuperPay ativo",
    timestamp: new Date().toISOString(),
  })
}
