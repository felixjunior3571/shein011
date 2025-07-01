import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [SuperPay Simulate] Iniciando simulação de pagamento")

    const body = await request.json()
    const { external_id, status_code = 5, amount = 27.97 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📋 [SuperPay Simulate] Parâmetros:", { external_id, status_code, amount })

    // Simular estrutura exata do webhook SuperPayBR
    const simulatedWebhook = {
      event: {
        type: "invoice.status_changed",
        created_at: new Date().toISOString(),
      },
      invoices: {
        id: `INV_${Date.now()}`,
        external_id,
        token: `TOKEN_${Math.random().toString(36).substring(2, 15)}`,
        status: {
          code: status_code,
          text: status_code === 5 ? "paid" : "pending",
          title: status_code === 5 ? "Pagamento Confirmado!" : "Aguardando Pagamento",
          description: status_code === 5 ? "Pagamento processado com sucesso" : "Aguardando confirmação",
        },
        prices: {
          total: Math.round(amount * 100), // SuperPay trabalha em centavos
          gross: Math.round(amount * 100),
          net: Math.round(amount * 100),
        },
        payment: {
          payDate: status_code === 5 ? new Date().toISOString() : null,
          date: new Date().toISOString(),
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          gateway: "SuperPay",
          details: {
            qrcode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
            pix_code: `00020101021226580014br.gov.bcb.pix2536${external_id}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304XXXX`,
            barcode: null,
          },
        },
        customer: {
          name: "Cliente Teste",
          email: "teste@exemplo.com",
          document: "12345678901",
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }

    console.log("📦 [SuperPay Simulate] Webhook simulado:", JSON.stringify(simulatedWebhook, null, 2))

    // Determinar URL do webhook baseada no ambiente
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const webhookUrl = `${baseUrl}/api/superpaybr/webhook`

    console.log("🔗 [SuperPay Simulate] Enviando para webhook:", webhookUrl)

    // Enviar webhook simulado para o próprio endpoint
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SuperPay-Webhook-Simulator/1.0",
        "X-SuperPay-Event": "invoice.status_changed",
        "X-SuperPay-Signature": `sha256=${Math.random().toString(36).substring(2, 15)}`,
      },
      body: JSON.stringify(simulatedWebhook),
    })

    const webhookResult = await webhookResponse.json()

    console.log("📥 [SuperPay Simulate] Resposta do webhook:", webhookResult)

    if (webhookResponse.ok && webhookResult.success) {
      console.log("✅ [SuperPay Simulate] Simulação executada com sucesso!")

      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        data: {
          external_id,
          status_code,
          amount,
          webhook_sent: true,
          webhook_response: webhookResult,
          simulated_at: new Date().toISOString(),
        },
      })
    } else {
      console.error("❌ [SuperPay Simulate] Erro no webhook:", webhookResult)

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
    console.error("❌ [SuperPay Simulate] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPay Payment Simulation endpoint ativo",
    usage: {
      method: "POST",
      body: {
        external_id: "string (obrigatório)",
        status_code: "number (opcional, padrão: 5)",
        amount: "number (opcional, padrão: 27.97)",
      },
      example: {
        external_id: "SHEIN_123456789",
        status_code: 5,
        amount: 27.97,
      },
    },
    timestamp: new Date().toISOString(),
  })
}
