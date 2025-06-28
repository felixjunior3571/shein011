import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_id, status = "paid" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("=== SIMULANDO PAGAMENTO SUPERPAYBR ===")
    console.log("External ID:", external_id)
    console.log("Status:", status)

    // Simular webhook SuperPayBR
    const simulatedWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `TOKEN_${Date.now()}`,
        date: new Date().toISOString(),
        status: {
          code: status === "paid" ? 5 : status === "denied" ? 12 : 1,
          title:
            status === "paid"
              ? "Pagamento Confirmado!"
              : status === "denied"
                ? "Pagamento Negado!"
                : "Aguardando Pagamento",
          description:
            status === "paid"
              ? "Obrigado pela sua Compra!"
              : status === "denied"
                ? "Pagamento foi negado"
                : "Aguardando pagamento",
        },
        customer: 123456789,
        prices: {
          total: 1990,
          discount: 0,
          taxs: {
            others: null,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPay",
          date: status === "paid" ? new Date().toISOString() : null,
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: status === "paid" ? `PAY_${Date.now()}` : null,
          payDate: status === "paid" ? new Date().toISOString() : null,
          details: {
            barcode: null,
            pix_code: "00020101021226840014br.gov.bcb.pix...",
            qrcode: "https://faturas.iugu.com/qr_code/simulated",
            url: "https://faturas.iugu.com/simulated",
          },
        },
      },
    }

    console.log("📤 Enviando webhook simulado:", JSON.stringify(simulatedWebhook, null, 2))

    // Enviar para o próprio webhook
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhook),
    })

    const webhookResult = await webhookResponse.json()

    if (webhookResponse.ok) {
      console.log("✅ Webhook simulado processado com sucesso")
      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        external_id: external_id,
        status: status,
        webhook_result: webhookResult,
      })
    } else {
      console.log("❌ Erro ao processar webhook simulado")
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar webhook simulado",
          details: webhookResult,
        },
        { status: 500 },
      )
    }
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
