import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🎭 Simulando pagamento SuperPayBR...")

    const body = await request.json()
    const { external_id, invoice_id, amount = 10.0 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório para simulação",
        },
        { status: 400 },
      )
    }

    // ✅ SIMULAR WEBHOOK DE PAGAMENTO CONFIRMADO
    const simulatedWebhookPayload = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString(),
      },
      invoices: {
        id: invoice_id || `sim_${Date.now()}`,
        external_id: external_id,
        token: `token_${Date.now()}`,
        status: {
          code: 5, // Pago
          title: "Pago",
          description: "Pagamento confirmado via simulação",
        },
        prices: {
          total: amount,
        },
        type: "PIX" as const,
        payment: {
          gateway: "superpaybr",
          payId: `pay_${Date.now()}`,
          payDate: new Date().toISOString(),
          due: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          details: {
            pix_code: `PIX_SIMULADO_${Date.now()}`,
            qrcode: `https://quickchart.io/qr?text=PIX_SIMULADO_${Date.now()}&size=300`,
            url: `https://pay.superpaybr.com/sim_${Date.now()}`,
          },
        },
      },
    }

    console.log("📤 Enviando webhook simulado para processamento...")

    // Enviar para o próprio webhook
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhookPayload),
    })

    const webhookResult = await webhookResponse.json()

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso!",
      data: {
        external_id: external_id,
        invoice_id: simulatedWebhookPayload.invoices.id,
        amount: amount,
        status: "Pago",
        simulated_at: new Date().toISOString(),
      },
      webhook_result: webhookResult,
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na simulação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
