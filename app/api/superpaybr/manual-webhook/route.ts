import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 [Manual Webhook] Processando webhook manual...")

    // Dados do webhook que falhou (baseado nos logs fornecidos)
    const manualWebhookData = {
      event: {
        type: "invoice.update",
        date: "2025-07-01 03:03:33",
      },
      invoices: {
        id: "1751350068",
        external_id: "SHEIN_1751349759845_i6qouytzp",
        token: "9f48ca0a-d3ae-4d2b-b1a3-afeb672ae21d",
        date: "2025-07-01 03:02:42",
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
          date: "2025-07-01 03:03:33",
          due: "2025-07-02 00:00:00",
          card: null,
          payId: null,
          payDate: "2025-07-01 03:03:33",
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/f55b76c1-b79c-4a2e-b0e9-6452955c7c795204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***6304C0EE",
            url: null,
          },
        },
      },
    }

    console.log("📦 [Manual Webhook] Dados do webhook:", JSON.stringify(manualWebhookData, null, 2))

    // Chamar o webhook handler interno
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Manual-Webhook-Test",
      },
      body: JSON.stringify(manualWebhookData),
    })

    const webhookResult = await webhookResponse.json()

    console.log("📋 [Manual Webhook] Resposta do webhook:", webhookResult)
    console.log("📊 [Manual Webhook] Status HTTP:", webhookResponse.status)

    if (webhookResponse.ok) {
      console.log("✅ [Manual Webhook] Webhook processado com sucesso!")

      return NextResponse.json({
        success: true,
        message: "Webhook manual processado com sucesso",
        webhook_status: webhookResponse.status,
        webhook_response: webhookResult,
        processed_data: {
          external_id: manualWebhookData.invoices.external_id,
          status_code: manualWebhookData.invoices.status.code,
          amount: manualWebhookData.invoices.prices.total,
          is_paid: manualWebhookData.invoices.status.code === 5,
        },
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error("❌ [Manual Webhook] Erro no processamento:", webhookResult)

      return NextResponse.json(
        {
          success: false,
          message: "Erro no processamento do webhook manual",
          webhook_status: webhookResponse.status,
          webhook_response: webhookResult,
          error_details: webhookResult,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [Manual Webhook] Erro crítico:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Erro crítico no webhook manual",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Manual Webhook endpoint ativo",
    description: "Use POST para processar webhook manual",
    timestamp: new Date().toISOString(),
  })
}
