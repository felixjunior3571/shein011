import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULANDO PAGAMENTO SUPERPAYBR...")

    const body = await request.json()
    const { external_id, amount } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório para simulação",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento para:", { external_id, amount })

    // Simular webhook SuperPayBR com status.code === 5 (Pagamento Confirmado!)
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `simulated_${Date.now()}`,
        external_id: external_id,
        token: `SIM_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString(),
        status: {
          code: 5, // ✅ Pagamento Confirmado!
          title: "Pagamento Confirmado!",
          description: "Simulação de pagamento aprovado",
        },
        customer: "simulated_customer",
        prices: {
          total: amount || 34.9,
          discount: 0,
          taxs: {
            others: null,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPayBR",
          date: null,
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: `PAY_${Math.random().toString(36).substr(2, 9)}`,
          payDate: new Date().toISOString(),
          details: {
            barcode: null,
            pix_code: "simulated_pix_code",
            qrcode: "https://example.com/qr",
            url: "https://example.com/payment",
          },
        },
      },
    }

    console.log("📤 Enviando webhook simulado para processamento...")

    // Enviar webhook simulado para nosso próprio endpoint
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhookData),
    })

    const webhookResult = await webhookResponse.json()

    if (webhookResponse.ok) {
      console.log("✅ Webhook simulado processado com sucesso!")

      return NextResponse.json({
        success: true,
        message: "Pagamento SuperPayBR simulado com sucesso",
        external_id: external_id,
        simulated_data: simulatedWebhookData,
        webhook_result: webhookResult,
      })
    } else {
      throw new Error(`Erro ao processar webhook simulado: ${webhookResult.error}`)
    }
  } catch (error) {
    console.log("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na simulação SuperPayBR",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Simulate Payment endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
