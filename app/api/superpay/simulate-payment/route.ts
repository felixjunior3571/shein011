import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Simulação de pagamento SuperPay iniciada")

    const body = await request.json()
    const { external_id, status_code, amount } = body

    if (!external_id || !status_code || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos obrigatórios: external_id, status_code, amount",
        },
        { status: 400 },
      )
    }

    // Simular webhook SuperPay conforme estrutura real
    const simulatedWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `sim-${Math.random().toString(36).substring(2, 15)}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: Number.parseInt(status_code),
          title: getStatusTitle(Number.parseInt(status_code)),
          description: getStatusDescription(Number.parseInt(status_code)),
          text: Number.parseInt(status_code) === 5 ? "approved" : "pending",
        },
        customer: 999999,
        prices: {
          total: Number.parseFloat(amount),
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
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: null,
          payDate:
            Number.parseInt(status_code) === 5 ? new Date().toISOString().replace("T", " ").substring(0, 19) : null,
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126580014br.gov.bcb.pix2536pix.example.com/qr/v2/simulation123456789053039865802BR5925SIMULACAO_SUPERPAY_TEST6009SAO_PAULO62070503***6304ABCD",
            url: null,
          },
        },
      },
    }

    console.log("📤 Enviando webhook simulado para endpoint SuperPay:", simulatedWebhook)

    // Enviar webhook para o próprio endpoint
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/superpay/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        UserId: "999",
        id: "999999",
        Gateway: "SIMULATION",
        Powered: "SIMULATION",
        Webhook: "U2ltdWxhY2FvU3VwZXJQYXk=",
      },
      body: JSON.stringify(simulatedWebhook),
    })

    const webhookResult = await webhookResponse.json()

    console.log("✅ Resposta do webhook simulado:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      simulation: {
        external_id: external_id,
        status_code: Number.parseInt(status_code),
        status_name: getStatusTitle(Number.parseInt(status_code)),
        amount: Number.parseFloat(amount),
        simulated_at: new Date().toISOString(),
      },
      webhook_response: webhookResult,
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

function getStatusTitle(statusCode: number): string {
  const titles: Record<number, string> = {
    1: "Aguardando Pagamento",
    2: "Em Processamento",
    3: "Processando",
    4: "Aprovado",
    5: "Pagamento Confirmado!",
    6: "Cancelado",
    7: "Contestado",
    8: "Chargeback",
    9: "Estornado",
    10: "Falha",
    11: "Bloqueado",
    12: "Negado",
    13: "Em Análise",
    14: "Análise Manual",
    15: "Vencido",
  }
  return titles[statusCode] || `Status ${statusCode}`
}

function getStatusDescription(statusCode: number): string {
  const descriptions: Record<number, string> = {
    1: "Aguardando confirmação do pagamento",
    2: "Pagamento em processamento",
    3: "Processando pagamento",
    4: "Pagamento aprovado",
    5: "Obrigado pela sua Compra!",
    6: "Pagamento cancelado",
    7: "Pagamento contestado",
    8: "Chargeback detectado",
    9: "Pagamento estornado",
    10: "Falha no pagamento",
    11: "Pagamento bloqueado",
    12: "Pagamento negado",
    13: "Pagamento em análise",
    14: "Análise manual necessária",
    15: "Pagamento vencido",
  }
  return descriptions[statusCode] || `Descrição do status ${statusCode}`
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de simulação SuperPay ativo",
    supported_status_codes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    required_fields: ["external_id", "status_code", "amount"],
    timestamp: new Date().toISOString(),
  })
}
