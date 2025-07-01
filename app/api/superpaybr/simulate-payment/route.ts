import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Simulate Payment] Iniciando simulação de pagamento")

    const body = await request.json()
    const { external_id, status_code = 5, amount = 27.97 } = body

    if (!external_id) {
      console.error("❌ [Simulate Payment] external_id é obrigatório")
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Simulate Payment] Simulando pagamento:`, {
      external_id,
      status_code,
      amount,
    })

    // Determinar URL base para webhook
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
    const webhookUrl = `${baseUrl}/api/superpaybr/webhook`

    console.log(`📡 [Simulate Payment] Enviando webhook para: ${webhookUrl}`)

    // Estrutura exata do webhook SuperPayBR
    const webhookPayload = {
      invoices: {
        id: `INV_${Date.now()}`,
        external_id: external_id,
        token: `TOKEN_${Math.random().toString(36).substring(2, 15)}`,
        status: {
          code: status_code,
          name: getStatusName(status_code),
          title: getStatusTitle(status_code),
        },
        prices: {
          total: amount,
          net: amount * 0.95, // Simular taxa
          gross: amount,
        },
        payment: {
          gateway: "SuperPay",
          method: "PIX",
          payDate: status_code === 5 ? new Date().toISOString() : null,
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          details: {
            qrcode: status_code === 1 ? generateMockQRCode() : null,
            pix_code: status_code === 1 ? generateMockPixCode(amount) : null,
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
      event: "invoice.status_changed",
      timestamp: new Date().toISOString(),
    }

    console.log("📦 [Simulate Payment] Payload do webhook:", JSON.stringify(webhookPayload, null, 2))

    // Enviar webhook para nosso próprio endpoint
    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SuperPay-Webhook/1.0",
        "X-SuperPay-Event": "invoice.status_changed",
        "X-SuperPay-Signature": "mock_signature",
      },
      body: JSON.stringify(webhookPayload),
    })

    const webhookResult = await webhookResponse.json()

    if (webhookResponse.ok) {
      console.log("✅ [Simulate Payment] Webhook enviado com sucesso:", webhookResult)
      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        data: {
          external_id,
          status_code,
          status_title: getStatusTitle(status_code),
          amount,
          webhook_sent: true,
          webhook_response: webhookResult,
        },
      })
    } else {
      console.error("❌ [Simulate Payment] Erro no webhook:", webhookResult)
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
    console.error("❌ [Simulate Payment] Erro geral:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Funções auxiliares para mapear status
function getStatusName(code: number): string {
  const statusMap: Record<number, string> = {
    1: "pending",
    2: "processing",
    3: "analyzing",
    4: "approved",
    5: "paid",
    6: "denied",
    7: "refunded",
    8: "partial_refund",
    9: "expired",
    10: "canceled",
    12: "chargeback",
    15: "dispute",
    16: "fraud",
  }
  return statusMap[code] || "unknown"
}

function getStatusTitle(code: number): string {
  const titleMap: Record<number, string> = {
    1: "Aguardando Pagamento",
    2: "Processando",
    3: "Analisando",
    4: "Aprovado",
    5: "Pagamento Confirmado!",
    6: "Pagamento Negado",
    7: "Estornado",
    8: "Estorno Parcial",
    9: "Vencido",
    10: "Cancelado",
    12: "Chargeback",
    15: "Disputa",
    16: "Fraude",
  }
  return titleMap[code] || `Status ${code}`
}

function generateMockQRCode(): string {
  return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`
}

function generateMockPixCode(amount: number): string {
  const timestamp = Date.now().toString()
  return `00020101021226580014br.gov.bcb.pix2536mock.quickchart.io/qr/v2/${timestamp}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304${timestamp.slice(-4)}`
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de simulação de pagamento SuperPayBR",
    usage: {
      method: "POST",
      body: {
        external_id: "string (obrigatório)",
        status_code: "number (opcional, padrão: 5)",
        amount: "number (opcional, padrão: 27.97)",
      },
    },
  })
}
