import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { external_id, amount, redirect_type } = await request.json()

    if (!external_id) {
      return NextResponse.json({ error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log("🧪 Simulando pagamento SuperPayBR:", { external_id, amount, redirect_type })

    // Simular payload de webhook SuperPayBR
    const simulatedWebhookPayload = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: Math.floor(Math.random() * 9999999),
        external_id: external_id,
        token: `SIMULATED_${Date.now()}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: 5, // Pagamento confirmado
          title: "Pagamento Confirmado!",
          description: "Simulação de pagamento aprovado",
        },
        customer: Math.floor(Math.random() * 9999999),
        prices: {
          total: Math.round((amount || 0) * 100), // Converter para centavos
          discount: 0,
          taxs: {
            others: 0,
          },
          refund: null,
        },
        type: "pix",
        payment: {
          gateway: "gerencianet",
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
          due: new Date(Date.now() + 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: `SIM_${Date.now()}`,
          payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
        },
      },
    }

    console.log("📦 Payload simulado:", JSON.stringify(simulatedWebhookPayload, null, 2))

    // Chamar o webhook real com o payload simulado
    const webhookUrl = new URL("/api/superpaybr/webhook", request.url)
    const webhookResponse = await fetch(webhookUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhookPayload),
    })

    const webhookResult = await webhookResponse.json()

    console.log("✅ Resposta do webhook:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      external_id: external_id,
      amount: amount,
      redirect_type: redirect_type,
      webhook_payload: simulatedWebhookPayload,
      webhook_response: webhookResult,
      simulated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na simulação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint de simulação de pagamento SuperPayBR",
    usage: "POST com external_id, amount e redirect_type",
    example: {
      external_id: "FRETE_1234567890",
      amount: 34.9,
      redirect_type: "checkout",
    },
  })
}
