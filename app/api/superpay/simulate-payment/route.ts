import { type NextRequest, NextResponse } from "next/server"
import { saveSuperPayPaymentConfirmation, type SuperPayWebhookPayload } from "@/lib/superpay-payment-storage"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("\n🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAY INICIADA!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    const body = await request.json()
    const { externalId, amount, statusCode = 5 } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "externalId é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📋 Dados da simulação:", {
      externalId,
      amount,
      statusCode,
    })

    // Criar payload simulado do webhook SuperPay
    const simulatedWebhookPayload: SuperPayWebhookPayload = {
      event: {
        type: "invoice.status_changed",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: externalId,
        token: null,
        date: new Date().toISOString(),
        status: {
          code: statusCode,
          title: statusCode === 5 ? "Pago" : "Simulado",
          description: `Pagamento simulado com status ${statusCode}`,
          text: statusCode === 5 ? "paid" : "simulated",
        },
        customer: 1,
        prices: {
          total: amount || 34.9,
          discount: 0,
          taxs: {
            others: 0,
          },
          refound: null,
        },
        type: "pix",
        payment: {
          gateway: "superpay_simulated",
          date: new Date().toISOString(),
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: `PAY_SIM_${Date.now()}`,
          payDate: new Date().toISOString(),
          details: {
            barcode: null,
            pix_code: `simulated_pix_${Date.now()}`,
            qrcode: "data:image/png;base64,simulated",
            url: null,
          },
        },
      },
    }

    console.log("📦 Payload simulado criado:", JSON.stringify(simulatedWebhookPayload, null, 2))

    // Salvar na memória usando a mesma função do webhook real
    const memoryData = {
      statusCode,
      statusName: statusCode === 5 ? "Pago" : "Simulado",
      statusDescription: `Pagamento simulado com status ${statusCode}`,
      amount: amount || 34.9,
      paymentDate: statusCode === 5 ? new Date().toISOString() : null,
    }

    const savedConfirmation = saveSuperPayPaymentConfirmation(
      externalId,
      simulatedWebhookPayload.invoices.id,
      null,
      memoryData,
    )

    console.log("💾 Confirmação salva na memória:", {
      external_id: savedConfirmation.externalId,
      token: savedConfirmation.token,
      status: savedConfirmation.statusName,
      is_paid: savedConfirmation.isPaid,
    })

    // Salvar no Supabase também
    try {
      const webhookRecord = {
        external_id: externalId,
        invoice_id: simulatedWebhookPayload.invoices.id,
        status_code: statusCode,
        status_name: savedConfirmation.statusName,
        amount: amount || 34.9,
        payment_date: savedConfirmation.paymentDate,
        webhook_data: simulatedWebhookPayload,
        processed_at: new Date().toISOString(),
        is_paid: savedConfirmation.isPaid,
        is_denied: savedConfirmation.isDenied,
        is_expired: savedConfirmation.isExpired,
        is_canceled: savedConfirmation.isCanceled,
        is_refunded: savedConfirmation.isRefunded,
        gateway: "superpay_simulated",
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
        console.log("✅ Simulação salva no Supabase:", supabaseResult.id)
      }
    } catch (supabaseErr) {
      console.error("❌ Erro crítico no Supabase:", supabaseErr)
    }

    const response = {
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: simulatedWebhookPayload.invoices.id,
        status_code: statusCode,
        status_name: savedConfirmation.statusName,
        amount: amount || 34.9,
        is_paid: savedConfirmation.isPaid,
        token: savedConfirmation.token,
        expires_at: savedConfirmation.expiresAt,
        simulated_at: new Date().toISOString(),
        storage: "memory + supabase",
      },
    }

    console.log("✅ Resposta da simulação SuperPay:", response)
    console.log("🏁 Simulação SuperPay concluída!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NA SIMULAÇÃO SUPERPAY:", error)

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
    status: "active",
    usage: "POST /api/superpay/simulate-payment",
    parameters: {
      externalId: "string (required)",
      amount: "number (optional, default: 34.90)",
      statusCode: "number (optional, default: 5 = Pago)",
    },
    supported_status_codes: {
      5: "Pago",
      6: "Cancelado",
      9: "Estornado",
      10: "Falha",
      11: "Bloqueado",
      12: "Negado",
      15: "Vencido",
    },
    timestamp: new Date().toISOString(),
  })
}
