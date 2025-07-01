import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [Manual Webhook] Processando webhook manual...")

    // Dados do webhook real que falhou
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
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpay/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookData),
    })

    const webhookResult = await webhookResponse.json()

    console.log("✅ [Manual Webhook] Resposta do webhook:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Webhook manual processado com sucesso",
      webhook_response: webhookResult,
      webhook_status: webhookResponse.status,
      data: webhookData.invoices,
    })
  } catch (error) {
    console.error("❌ [Manual Webhook] Erro:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook manual",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Manual Webhook Processor",
    status: "ready",
    external_id: "SHEIN_1751350461481_922teqg5i",
    amount: 27.97,
    timestamp: new Date().toISOString(),
  })
}
