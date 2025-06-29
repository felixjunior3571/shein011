import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const { external_id, amount } = await request.json()

    if (!external_id) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log("🎯 Simulando pagamento para:", { external_id, amount })

    // Simular dados de webhook de pagamento confirmado
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
          code: 5, // SuperPayBR: 5 = Pagamento Confirmado
          title: "Pagamento Confirmado!",
          description: "Obrigado pela sua Compra!",
          text: "approved",
        },
        customer: 999999,
        prices: {
          total: Number.parseFloat(amount?.toString() || "34.90"),
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
          due: new Date().toISOString().split("T")[0] + " 00:00:00",
          card: null,
          payId: null,
          payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
          details: {
            barcode: null,
            pix_code: null,
            qrcode: `00020126580014br.gov.bcb.pix2536pix.superpaybr.com/qr/v2/${external_id}520400005303986540${Number.parseFloat(amount?.toString() || "34.90").toFixed(2)}5802BR5909SHEIN CARD5011SAO PAULO62070503***6304ABCD`,
            url: null,
          },
        },
      },
    }

    console.log("📤 Dados simulados do webhook:", JSON.stringify(simulatedWebhookData, null, 2))

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

      return NextResponse.json({
        success: true,
        message: "Pagamento SuperPayBR simulado com sucesso!",
        external_id: external_id,
        amount: Number.parseFloat(amount?.toString() || "34.90"),
        status: "paid",
        webhook_processed: true,
        timestamp: new Date().toISOString(),
      })
    } else {
      throw new Error(`Erro ao processar webhook simulado: ${webhookResult.error}`)
    }
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na simulação",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Use POST para simular pagamento",
    example: {
      external_id: "SHEIN_1234567890_abc123",
      amount: 34.9,
    },
    timestamp: new Date().toISOString(),
  })
}
