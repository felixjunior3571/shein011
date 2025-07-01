import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Manual Webhook] Processando webhook manual...")

    // Dados do webhook que falhou
    const webhookData = {
      event: {
        type: "webhook.update",
        date: "2025-07-01 03:15:09",
      },
      invoices: {
        id: "1751350770",
        external_id: "SHEIN_1751350461481_922teqg5i",
        token: null,
        date: "2025-07-01 03:14:23",
        status: {
          code: 5,
          title: "Pagamento Confirmado!",
          description: "Obrigado pela sua Compra!",
          text: "approved",
        },
        customer: 138512,
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
          date: "2025-07-01 03:15:07",
          due: "2025-07-02 00:00:00",
          card: null,
          payId: null,
          payDate: "2025-07-01 03:15:07",
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/722b7c79-99a8-423d-8352-baa4d969be775204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***630436F3",
            url: null,
          },
        },
      },
    }

    console.log("📦 [Manual Webhook] Dados do webhook:", JSON.stringify(webhookData, null, 2))

    // Chamar o endpoint do webhook
    const webhookUrl = `${request.nextUrl.origin}/api/superpay/webhook`
    console.log("🔗 [Manual Webhook] Chamando:", webhookUrl)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Manual-Webhook-Test",
      },
      body: JSON.stringify(webhookData),
    })

    const responseData = await response.json()

    console.log("📥 [Manual Webhook] Resposta do webhook:", responseData)
    console.log("📊 [Manual Webhook] Status HTTP:", response.status)

    return NextResponse.json({
      success: true,
      message: "Webhook manual processado com sucesso",
      webhook_status: response.status,
      webhook_response: responseData,
      processed_data: {
        external_id: webhookData.invoices.external_id,
        status_code: webhookData.invoices.status.code,
        amount: webhookData.invoices.prices.total,
        is_paid: webhookData.invoices.status.code === 5,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ [Manual Webhook] Erro:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro no processamento manual",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
