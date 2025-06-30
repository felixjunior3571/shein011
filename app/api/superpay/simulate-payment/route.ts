import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  saveSuperPayPaymentConfirmation,
  type SuperPayWebhookPayload,
  SUPERPAY_STATUS_CODES,
} from "@/lib/superpay-payment-storage"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

    // Criar payload simulado do webhook SuperPay
    const simulatedWebhookPayload: SuperPayWebhookPayload = {
      event: {
        type: "webhook.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: externalId,
        token: null,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: statusCode,
          title: SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES]?.name || "Simulado",
          description: "Pagamento simulado para testes",
          text: statusCode === 5 ? "approved" : "pending",
        },
        customer: 999999,
        prices: {
          total: amount,
          discount: 0,
          taxs: {
            others: 0,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPay",
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: null,
          payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126580014br.gov.bcb.pix2536simulated.test.com/qr/v3/SIMULATED520400005303986540" +
              amount.toFixed(2) +
              "5802BR5925SIMULATED_PAYMENT6009SAO PAULO62070503***6304ABCD",
            url: null,
          },
        },
      },
    }

    // Processar como se fosse um webhook real
    const statusInfo =
      SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]

    // Salvar na memória
    const memoryData = {
      statusCode,
      statusName: statusInfo.name,
      statusDescription: "Pagamento simulado para testes",
      amount,
      paymentDate: statusInfo.isPaid ? simulatedWebhookPayload.invoices.payment.payDate : null,
    }

    const savedConfirmation = saveSuperPayPaymentConfirmation(
      externalId,
      simulatedWebhookPayload.invoices.id,
      null,
      memoryData,
    )

    // Salvar no Supabase
    const webhookRecord = {
      external_id: externalId,
      invoice_id: simulatedWebhookPayload.invoices.id,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      payment_date: statusInfo.isPaid ? simulatedWebhookPayload.invoices.payment.payDate : null,
      webhook_data: simulatedWebhookPayload,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
      token: savedConfirmation.token,
      expires_at: savedConfirmation.expiresAt,
    }

    const { data: supabaseResult, error: supabaseError } = await supabase
      .from("payment_webhooks")
      .insert(webhookRecord)
      .select()
      .single()

    if (supabaseError) {
      console.error("❌ Erro ao salvar simulação no Supabase:", supabaseError)
    } else {
      console.log("✅ Simulação SuperPay salva no Supabase:", supabaseResult.id)
    }

    console.log("🎉 Pagamento SuperPay simulado com sucesso:", {
      external_id: externalId,
      status: statusInfo.name,
      amount: amount,
      token: savedConfirmation.token,
      is_paid: statusInfo.isPaid,
    })

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: simulatedWebhookPayload.invoices.id,
        status_code: statusCode,
        status_name: statusInfo.name,
        amount: amount,
        is_paid: statusInfo.isPaid,
        token: savedConfirmation.token,
        expires_at: savedConfirmation.expiresAt,
        simulated: true,
        processed_at: new Date().toISOString(),
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
    message: "SuperPay Payment Simulation Endpoint",
    usage: "POST com { externalId, amount?, statusCode? }",
    status_codes: {
      1: "Aguardando Pagamento",
      5: "Pago",
      6: "Cancelado",
      9: "Estornado",
      10: "Falha",
      12: "Negado",
      15: "Vencido",
    },
    example: {
      externalId: "SHEIN_1234567890_abc123",
      amount: 34.9,
      statusCode: 5,
    },
    timestamp: new Date().toISOString(),
  })
}
