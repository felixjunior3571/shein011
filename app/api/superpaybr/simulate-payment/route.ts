import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULANDO PAGAMENTO SUPERPAYBR")

    const body = await request.json()
    const { external_id, amount } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento SuperPayBR para:", external_id)

    // Simular webhook data SuperPayBR (IDÊNTICO AO SISTEMA TRYPLOPAY)
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id,
        token: `SIM_TOKEN_${Date.now()}`,
        date: new Date().toISOString(),
        status: {
          code: 5, // Pagamento Confirmado!
          title: "Pagamento Confirmado!",
          description: "Obrigado pela sua Compra!",
        },
        customer: "SIMULATED_CUSTOMER",
        prices: {
          total: Math.round((amount || 34.9) * 100), // SuperPayBR usa centavos
          discount: 0,
          taxs: {
            others: null,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPay",
          date: null,
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: `SIM_PAY_${Date.now()}`,
          payDate: new Date().toISOString(),
          details: {
            barcode: null,
            pix_code: "SIMULATED_PIX_CODE",
            qrcode: "https://example.com/qr",
            url: "https://example.com/payment",
          },
        },
      },
    }

    console.log("📤 Enviando webhook simulado SuperPayBR...")

    // Enviar para o próprio webhook
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhookData),
    })

    const webhookResult = await webhookResponse.json()

    console.log("✅ Webhook SuperPayBR simulado enviado:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      external_id,
      simulated_data: simulatedWebhookData,
      webhook_result: webhookResult,
    })
  } catch (error) {
    console.log("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao simular pagamento",
      },
      { status: 500 },
    )
  }
}
