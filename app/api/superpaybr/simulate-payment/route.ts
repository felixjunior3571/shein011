import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAYBR INICIADA")

    const body = await request.json()
    const { external_id, status_code = 5, amount = 27.97 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📋 Dados da simulação:", {
      external_id,
      status_code,
      amount,
    })

    // Simular webhook completo da SuperPay
    const simulatedWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `simulated-token-${Date.now()}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: getStatusTitle(status_code),
          description: getStatusDescription(status_code),
          text: getStatusText(status_code),
        },
        customer: 999999,
        prices: {
          total: Number.parseFloat(amount.toString()),
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
          payDate: status_code === 5 ? new Date().toISOString().replace("T", " ").substring(0, 19) : null,
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126870014br.gov.bcb.pix2565pix.simulated.com.br/qr/v3/simulated520400005303986540" +
              amount.toFixed(2) +
              "5802BR5925SIMULATED_PAYMENT_TEST6006CANOAS62070503***630405EC",
            url: null,
          },
        },
      },
    }

    console.log("📦 Webhook simulado:", JSON.stringify(simulatedWebhook, null, 2))

    // Enviar webhook simulado para o endpoint real
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SuperPay-Webhook-Simulator/1.0",
        "X-Simulated": "true",
      },
      body: JSON.stringify(simulatedWebhook),
    })

    const webhookResult = await webhookResponse.json()

    console.log("📥 Resposta do webhook:", webhookResult)

    if (webhookResult.success) {
      console.log("✅ Simulação SuperPay processada com sucesso!")

      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        data: {
          external_id: external_id,
          status_code: status_code,
          status_title: getStatusTitle(status_code),
          amount: amount,
          simulated_at: new Date().toISOString(),
          webhook_response: webhookResult,
        },
      })
    } else {
      throw new Error(`Erro no webhook: ${webhookResult.error}`)
    }
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const statusCode = Number.parseInt(searchParams.get("status_code") || "5")
    const amount = Number.parseFloat(searchParams.get("amount") || "27.97")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro external_id é obrigatório",
          example: "/api/superpaybr/simulate-payment?external_id=SHEIN_123&status_code=5&amount=27.97",
        },
        { status: 400 },
      )
    }

    // Simular via POST
    const postResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/simulate-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: externalId,
        status_code: statusCode,
        amount: amount,
      }),
    })

    const result = await postResponse.json()

    return NextResponse.json(result, { status: postResponse.status })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação GET",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Funções auxiliares para mapear status
function getStatusTitle(code: number): string {
  const statusMap: Record<number, string> = {
    1: "Aguardando Pagamento",
    2: "Em Processamento",
    3: "Pagamento Agendado",
    4: "Autorizado",
    5: "Pagamento Confirmado!",
    6: "Cancelado",
    7: "Aguardando Estorno",
    8: "Parcialmente Estornado",
    9: "Estornado",
    10: "Contestado",
    12: "Pagamento Negado",
    15: "Pagamento Vencido",
    16: "Erro no Pagamento",
  }
  return statusMap[code] || "Status Desconhecido"
}

function getStatusDescription(code: number): string {
  const descriptionMap: Record<number, string> = {
    1: "Aguardando confirmação do pagamento",
    2: "Pagamento sendo processado",
    3: "Pagamento foi agendado",
    4: "Pagamento autorizado",
    5: "Obrigado pela sua Compra!",
    6: "Pagamento foi cancelado",
    7: "Aguardando processamento do estorno",
    8: "Parte do valor foi estornada",
    9: "Valor total foi estornado",
    10: "Pagamento está em contestação",
    12: "Pagamento foi recusado",
    15: "Prazo de pagamento expirou",
    16: "Ocorreu um erro no processamento",
  }
  return descriptionMap[code] || "Descrição não disponível"
}

function getStatusText(code: number): string {
  const textMap: Record<number, string> = {
    1: "pending",
    2: "processing",
    3: "scheduled",
    4: "authorized",
    5: "approved",
    6: "canceled",
    7: "refund_pending",
    8: "partially_refunded",
    9: "refunded",
    10: "disputed",
    12: "denied",
    15: "expired",
    16: "error",
  }
  return textMap[code] || "unknown"
}
