import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const { external_id, amount } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento para:", { external_id, amount })

    // Simular webhook de pagamento aprovado
    const simulatedWebhook = {
      external_id: external_id,
      status: {
        code: 5, // SuperPayBR: 5 = Pago
        title: "Pago",
      },
      amount: amount || 34.9,
      payment_date: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    }

    // Enviar para o próprio webhook
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhook),
    })

    if (!webhookResponse.ok) {
      throw new Error("Erro ao processar webhook simulado")
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      external_id: external_id,
      amount: amount,
      simulated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro na simulação",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Simulate Payment endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
