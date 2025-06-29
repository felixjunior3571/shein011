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

    console.log("🎯 Simulando pagamento para:", { external_id, amount })

    // Simular dados de webhook SuperPayBR
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `SIM_TOKEN_${Date.now()}`,
        date: new Date().toISOString(),
        status: {
          code: 5, // Pagamento Confirmado!
          title: "Pagamento Confirmado!",
          description: "Pagamento simulado com sucesso",
        },
        customer: "123456789",
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
          due: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: `SIM_PAY_${Date.now()}`,
          payDate: new Date().toISOString(),
          details: {
            barcode: null,
            pix_code: `SIM_PIX_${Date.now()}`,
            qrcode: "https://quickchart.io/qr?text=SIMULATED_PIX",
            url: "https://simulated.superpaybr.com/payment",
          },
        },
      },
    }

    console.log("📤 Enviando webhook simulado para processamento...")

    // Processar o webhook simulado
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhookData),
    })

    const webhookResult = await webhookResponse.json()

    if (webhookResult.success) {
      console.log("✅ Webhook simulado processado com sucesso!")

      // Também salvar no localStorage simulado
      const paymentData = {
        externalId: external_id,
        invoiceId: simulatedWebhookData.invoices.id,
        amount: simulatedWebhookData.invoices.prices.total,
        status: "paid",
        statusCode: 5,
        statusName: "Pagamento Confirmado!",
        statusDescription: "Pagamento simulado com sucesso",
        paymentDate: simulatedWebhookData.invoices.payment.payDate,
        paymentGateway: "SuperPay",
        paymentType: "PIX",
        isPaid: true,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
        token: simulatedWebhookData.invoices.token,
        provider: "superpaybr",
        processedAt: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        message: "Pagamento SuperPayBR simulado com sucesso",
        data: paymentData,
        webhook_result: webhookResult,
      })
    } else {
      throw new Error("Falha ao processar webhook simulado")
    }
  } catch (error) {
    console.log("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao simular pagamento SuperPayBR",
        details: error instanceof Error ? error.message : "Unknown error",
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
