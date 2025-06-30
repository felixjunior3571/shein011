import { type NextRequest, NextResponse } from "next/server"
import { saveSuperPayPaymentConfirmation } from "@/lib/superpay-payment-storage"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("\n🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAY INICIADA!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    const body = await request.json()
    const { external_id, amount, redirect_type, status_code = 5 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Dados da simulação SuperPay:", {
      external_id,
      amount: amount || 0,
      redirect_type: redirect_type || "unknown",
      status_code,
    })

    // Simular payload de webhook SuperPay
    const simulatedWebhookData = {
      event: {
        type: "webhook.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: null, // Será gerado automaticamente
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: status_code === 5 ? "Pagamento Confirmado!" : "Status Simulado",
          description: "Simulação de pagamento para testes",
          text: status_code === 5 ? "approved" : "simulated",
        },
        customer: 999999,
        prices: {
          total: amount || 0,
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
          payId: `SIM_PAY_${Date.now()}`,
          payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
          details: {
            barcode: null,
            pix_code: null,
            qrcode: "SIMULATED_QR_CODE",
            url: null,
          },
        },
      },
    }

    console.log("📦 Payload simulado SuperPay:", JSON.stringify(simulatedWebhookData, null, 2))

    // Salvar na memória
    const memoryData = {
      statusCode: status_code,
      statusName: status_code === 5 ? "Pagamento Confirmado!" : "Status Simulado",
      statusDescription: "Simulação de pagamento para testes",
      amount: amount || 0,
      paymentDate: status_code === 5 ? new Date().toISOString() : null,
    }

    const savedConfirmation = saveSuperPayPaymentConfirmation(
      external_id,
      simulatedWebhookData.invoices.id,
      null, // Token será gerado automaticamente
      memoryData,
    )

    console.log("💾 Confirmação salva na memória SuperPay:", {
      external_id: savedConfirmation.externalId,
      status: savedConfirmation.statusName,
      is_paid: savedConfirmation.isPaid,
      token: savedConfirmation.token,
      expires_at: savedConfirmation.expiresAt,
    })

    // Salvar no Supabase
    try {
      const webhookRecord = {
        external_id: external_id,
        invoice_id: simulatedWebhookData.invoices.id,
        status_code: status_code,
        status_name: status_code === 5 ? "Pagamento Confirmado!" : "Status Simulado",
        amount: amount || 0,
        payment_date: status_code === 5 ? new Date().toISOString() : null,
        webhook_data: simulatedWebhookData,
        processed_at: new Date().toISOString(),
        is_paid: status_code === 5,
        is_denied: status_code === 12,
        is_expired: status_code === 15,
        is_canceled: status_code === 6,
        is_refunded: status_code === 9,
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
        console.log("✅ Simulação salva no Supabase SuperPay:", supabaseResult.id)
      }
    } catch (supabaseErr) {
      console.error("❌ Erro crítico no Supabase:", supabaseErr)
      // Continuar mesmo se Supabase falhar
    }

    const response = {
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      data: {
        external_id: external_id,
        invoice_id: simulatedWebhookData.invoices.id,
        status_code: status_code,
        status_name: status_code === 5 ? "Pagamento Confirmado!" : "Status Simulado",
        amount: amount || 0,
        payment_date: status_code === 5 ? new Date().toISOString() : null,
        token: savedConfirmation.token,
        expires_at: savedConfirmation.expiresAt,
        simulated: true,
        redirect_type: redirect_type || "unknown",
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
    description: "Simula pagamentos para testes com tokens seguros",
    usage: "POST com { external_id, amount, redirect_type, status_code }",
    token_expiry: "15 minutes",
    timestamp: new Date().toISOString(),
  })
}
