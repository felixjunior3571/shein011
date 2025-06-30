import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 [SuperPayBR Simulate] Simulando pagamento...")

    const body = await request.json()
    const { externalId, amount, status = "paid" } = body

    if (!externalId) {
      return NextResponse.json({ success: false, error: "External ID is required" }, { status: 400 })
    }

    console.log("📋 [SuperPayBR Simulate] Dados:", { externalId, amount, status })

    // Mapear status para códigos SuperPayBR
    const statusMapping = {
      paid: { code: 5, title: "Pagamento Confirmado!", name: "paid" },
      denied: { code: 12, title: "Pagamento Negado", name: "denied" },
      expired: { code: 15, title: "Pagamento Vencido", name: "expired" },
      canceled: { code: 6, title: "Pagamento Cancelado", name: "canceled" },
      refunded: { code: 9, title: "Pagamento Estornado", name: "refunded" },
    }

    const selectedStatus = statusMapping[status as keyof typeof statusMapping] || statusMapping.paid

    // Simular webhook SuperPayBR
    const simulatedWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: externalId,
        token: `SIM_TOKEN_${Date.now()}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: selectedStatus.code,
          title: selectedStatus.title,
          description: `Simulação de ${selectedStatus.name}`,
        },
        customer: 123456789,
        prices: {
          total: Math.round((amount || 34.9) * 100), // SuperPayBR usa centavos
          discount: 0,
          taxs: {
            others: null,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPayBR",
          date: null,
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: `SIM_PAY_${Date.now()}`,
          payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
          details: {
            barcode: null,
            pix_code: `00020101021226840014br.gov.bcb.pix2536simulated.superpaybr.com/qr/v2/SIM${Date.now()}`,
            qrcode: `https://quickchart.io/qr?text=simulated_${externalId}`,
            url: `https://faturas.superpaybr.com/simulated-${externalId}`,
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
      },
      body: JSON.stringify(simulatedWebhook),
    })

    if (webhookResponse.ok) {
      const webhookResult = await webhookResponse.json()
      console.log("✅ [SuperPayBR Simulate] Webhook simulado processado:", webhookResult)

      return NextResponse.json({
        success: true,
        message: "Payment simulated successfully",
        externalId,
        status: selectedStatus.name,
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
