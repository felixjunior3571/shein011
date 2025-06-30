import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Testando webhook SuperPay com payload real")

    // Payload real da SuperPay
    const testPayload = {
      event: {
        type: "invoice.update",
        date: "2024-06-28 19:32:20",
      },
      invoices: {
        id: 2583973,
        external_id: "FRETE_1720867980282_984",
        token: "Z2VyaGFyZG9zCg==",
        date: "2024-06-28 19:33:03",
        status: {
          code: 5,
          title: "Pagamento Confirmado!",
          description: "Obrigado pela sua Compra!",
        },
        customer: 2712631,
        prices: {
          total: 1,
          discount: 0,
          taxs: {
            others: 0,
          },
          refund: null,
        },
        type: "pix",
        payment: {
          gateway: "gerencianet",
          date: "2024-06-28 19:33:03",
          due: "2024-06-28 20:33:00",
          card: null,
          payId: "1687715304",
          payDate: "2024-06-28 19:33:03",
        },
      },
    }

    console.log("📦 Enviando payload de teste:", JSON.stringify(testPayload, null, 2))

    // Chamar o webhook real
    const webhookUrl = new URL("/api/superpay/webhook", request.url)
    const response = await fetch(webhookUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    })

    const result = await response.json()

    console.log("✅ Resposta do webhook:", result)

    return NextResponse.json({
      success: true,
      message: "Teste de webhook executado",
      payload_sent: testPayload,
      webhook_response: result,
      webhook_status: response.status,
    })
  } catch (error) {
    console.error("❌ Erro no teste de webhook:", error)
    return NextResponse.json(
      {
        error: "Erro no teste",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint de teste do webhook SuperPay",
    usage: "POST para executar teste com payload real",
    test_payload: {
      event: {
        type: "invoice.update",
        date: "2024-06-28 19:32:20",
      },
      invoices: {
        external_id: "FRETE_1720867980282_984",
        status: {
          code: 5,
          title: "Pagamento Confirmado!",
        },
      },
    },
  })
}
