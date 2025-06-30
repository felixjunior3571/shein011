import { type NextRequest, NextResponse } from "next/server"
import { saveSuperPayBRPaymentConfirmation } from "@/lib/superpaybr-payment-storage"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("\n🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAYBR INICIADA!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    const body = await request.json()
    const { external_id, amount, redirect_type } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Dados da simulação SuperPayBR:", {
      external_id,
      amount: amount || 0,
      redirect_type: redirect_type || "unknown",
    })

    // Simulate SuperPayBR webhook payload
    const simulatedWebhookData = {
      event: {
        type: "webhook.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: null,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: 5, // Pagamento Confirmado!
          title: "Pagamento Confirmado!",
          description: "Simulação de pagamento aprovado",
          text: "approved",
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

    console.log("📦 Payload simulado SuperPayBR:", JSON.stringify(simulatedWebhookData, null, 2))

    // Save to memory
    const memoryData = {
      statusCode: 5,
      statusName: "Pagamento Confirmado!",
      statusDescription: "Simulação de pagamento aprovado",
      amount: amount || 0,
      paymentDate: new Date().toISOString(),
    }

    const savedConfirmation = saveSuperPayBRPaymentConfirmation(
      external_id,
      simulatedWebhookData.invoices.id,
      null,
      memoryData,
    )

    console.log("💾 Confirmação salva na memória SuperPayBR:", {
      external_id: savedConfirmation.externalId,
      status: savedConfirmation.statusName,
      is_paid: savedConfirmation.isPaid,
    })

    // Save to Supabase
    try {
      const webhookRecord = {
        external_id: external_id,
        invoice_id: simulatedWebhookData.invoices.id,
        status_code: 5,
        status_name: "Pagamento Confirmado!",
        amount: amount || 0,
        payment_date: new Date().toISOString(),
        webhook_data: simulatedWebhookData,
        processed_at: new Date().toISOString(),
        is_paid: true,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        gateway: "superpaybr",
      }

      const { data: supabaseResult, error: supabaseError } = await supabase
        .from("payment_webhooks")
        .insert(webhookRecord)
        .select()
        .single()

      if (supabaseError) {
        console.error("❌ Erro ao salvar simulação no Supabase:", supabaseError)
      } else {
        console.log("✅ Simulação salva no Supabase SuperPayBR:", supabaseResult.id)
      }
    } catch (supabaseErr) {
      console.error("❌ Erro crítico no Supabase:", supabaseErr)
      // Continue even if Supabase fails
    }

    const response = {
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      data: {
        external_id: external_id,
        invoice_id: simulatedWebhookData.invoices.id,
        status_code: 5,
        status_name: "Pagamento Confirmado!",
        amount: amount || 0,
        payment_date: new Date().toISOString(),
        simulated: true,
        redirect_type: redirect_type || "unknown",
        storage: "memory + supabase",
      },
    }

    console.log("✅ Resposta da simulação SuperPayBR:", response)
    console.log("🏁 Simulação SuperPayBR concluída!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NA SIMULAÇÃO SUPERPAYBR:", error)

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
    message: "SuperPayBR Payment Simulation Endpoint",
    status: "active",
    description: "Simula pagamentos aprovados para testes",
    usage: "POST com { external_id, amount, redirect_type }",
    timestamp: new Date().toISOString(),
  })
}
