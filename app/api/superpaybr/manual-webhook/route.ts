import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Manual Webhook] Processando webhook manual...")

    // Simular o webhook que foi recebido
    const manualWebhookData = {
      event: {
        type: "invoice.update",
        date: "2025-07-01 02:52:05",
      },
      invoices: {
        id: "1751349327",
        external_id: "SHEIN_1751349018795_90tml3wif",
        token: "9f48c5a0-1554-4c5d-9dc9-873e274aeeb3",
        date: "2025-07-01 02:50:21",
        status: {
          code: 5,
          title: "Pagamento Confirmado!",
          description: "Obrigado pela sua Compra!",
          text: "approved",
        },
        customer: 138511,
        prices: {
          total: 27.97,
          discount: 0,
          taxs: {
            others: 0,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPay",
          date: "2025-07-01 02:52:05",
          due: "2025-07-02 00:00:00",
          card: null,
          payId: null,
          payDate: "2025-07-01 02:52:05",
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/64d1310a-7ee4-445b-8026-fbe85d6ffa375204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***63047824",
            url: null,
          },
        },
      },
    }

    console.log("📦 [Manual Webhook] Dados do webhook:", JSON.stringify(manualWebhookData, null, 2))

    // Chamar o webhook real
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(manualWebhookData),
    })

    const webhookResult = await webhookResponse.json()

    console.log("✅ [Manual Webhook] Resultado:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Webhook manual processado",
      webhook_response: webhookResult,
      webhook_status: webhookResponse.status,
    })
  } catch (error) {
    console.error("❌ [Manual Webhook] Erro:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro no webhook manual",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
