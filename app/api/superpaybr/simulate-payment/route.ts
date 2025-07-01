import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [SuperPayBR Simulate] Simulando pagamento...")

    const body = await request.json()
    const { external_id, amount = 27.97, status_code = 5 } = body

    if (!external_id) {
      return NextResponse.json({ success: false, error: "External ID is required" }, { status: 400 })
    }

    console.log("📋 [SuperPayBR Simulate] Dados:", { external_id, amount, status_code })

    // Mapear status para códigos SuperPayBR
    const statusMapping = {
      1: { name: "pending", title: "Aguardando Pagamento", description: "Aguardando confirmação", text: "pending" },
      5: { name: "paid", title: "Pagamento Confirmado!", description: "Obrigado pela sua Compra!", text: "approved" },
      6: { name: "canceled", title: "Pagamento Cancelado", description: "Pagamento cancelado", text: "canceled" },
      9: { name: "refunded", title: "Pagamento Estornado", description: "Pagamento estornado", text: "refunded" },
      12: { name: "denied", title: "Pagamento Negado", description: "Pagamento negado pelo banco", text: "denied" },
      15: { name: "expired", title: "Pagamento Vencido", description: "Pagamento venceu", text: "expired" },
    }

    const selectedStatus = statusMapping[status_code as keyof typeof statusMapping] || statusMapping[5]

    // Simular webhook SuperPayBR conforme estrutura real fornecida
    const simulatedWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `sim-token-${Date.now()}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: selectedStatus.title,
          description: selectedStatus.description,
          text: selectedStatus.text,
        },
        customer: 999999,
        prices: {
          total: amount,
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
            qrcode: `00020126870014br.gov.bcb.pix2565pix.simulated.com.br/qr/v3/at/sim-${Date.now()}`,
            url: null,
          },
        },
      },
    }

    console.log("📤 [SuperPayBR Simulate] Enviando webhook simulado...")

    // Enviar para nosso próprio webhook
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SuperPayBR-Simulator/1.0",
      },
      body: JSON.stringify(simulatedWebhook),
    })

    if (webhookResponse.ok) {
      const webhookResult = await webhookResponse.json()
      console.log("✅ [SuperPayBR Simulate] Webhook simulado processado:", webhookResult)

      return NextResponse.json({
        success: true,
        message: "Payment simulated successfully",
        external_id,
        status_code,
        status_name: selectedStatus.name,
        webhookResult,
        simulatedData: simulatedWebhook,
      })
    } else {
      const error = await webhookResponse.text()
      console.log("❌ [SuperPayBR Simulate] Erro no webhook:", error)

      return NextResponse.json(
        {
          success: false,
          error: "Failed to process simulated webhook",
          details: error,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Simulate] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Simulation endpoint is active",
    usage: "POST with { external_id, amount?, status_code? }",
    status_codes: {
      1: "Aguardando Pagamento",
      5: "Pagamento Confirmado (Pago)",
      6: "Cancelado",
      9: "Estornado",
      12: "Pagamento Negado",
      15: "Pagamento Vencido",
    },
  })
}
