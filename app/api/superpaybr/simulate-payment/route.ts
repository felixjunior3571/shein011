import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAY INICIADA")

    const body = await request.json()
    const { external_id, status_code = 5, amount = 27.97 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID obrigatório",
          message: "Forneça o external_id para simular o pagamento",
        },
        { status: 400 },
      )
    }

    console.log("📋 Dados da simulação:", {
      external_id,
      status_code,
      amount,
    })

    // Simular webhook data completo da SuperPay
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `simulated-token-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: status_code === 5 ? "Pagamento Confirmado!" : "Status Simulado",
          description: status_code === 5 ? "Obrigado pela sua Compra!" : "Simulação de pagamento",
          text: status_code === 5 ? "approved" : "simulated",
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
            qrcode: "00020126870014br.gov.bcb.pix2565pix.simulated.com.br/qr/v3/simulated",
            url: null,
          },
        },
      },
    }

    console.log("📦 Webhook simulado:", JSON.stringify(simulatedWebhookData, null, 2))

    // Processar webhook simulado através do próprio endpoint
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SuperPay-Simulator/1.0",
        "X-Simulated": "true",
      },
      body: JSON.stringify(simulatedWebhookData),
    })

    const webhookResult = await webhookResponse.json()

    if (webhookResponse.ok && webhookResult.success) {
      console.log("✅ Webhook simulado processado com sucesso!")

      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        data: {
          external_id: external_id,
          status_code: status_code,
          amount: amount,
          simulated_at: new Date().toISOString(),
          webhook_processed: true,
          webhook_response: webhookResult,
        },
      })
    } else {
      console.error("❌ Erro ao processar webhook simulado:", webhookResult)

      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar webhook simulado",
          message: webhookResult.message || "Erro desconhecido",
          webhook_response: webhookResult,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID obrigatório",
          message: "Forneça externalId como parâmetro de query",
        },
        { status: 400 },
      )
    }

    // Simular pagamento aprovado automaticamente
    const simulateResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/simulate-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: externalId,
        status_code: 5,
        amount: 27.97,
      }),
    })

    const result = await simulateResponse.json()

    return NextResponse.json({
      success: true,
      message: "Simulação via GET executada",
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação via GET",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
