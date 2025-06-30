import { type NextRequest, NextResponse } from "next/server"
import { globalPaymentConfirmations } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount = 34.9, redirect_type = "checkout" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🧪 Simulando pagamento para: ${external_id}`)
    console.log(`💰 Valor: R$ ${amount}`)
    console.log(`🔄 Tipo: ${redirect_type}`)

    // Simular dados de confirmação de pagamento
    const simulatedConfirmation = {
      isPaid: true,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
      statusCode: 5, // SuperPayBR: 5 = Pago
      statusName: "Pagamento Confirmado (Simulado)",
      amount: Number.parseFloat(amount.toString()),
      paymentDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      externalId: external_id,
      invoiceId: `SIM_${Date.now()}`,
    }

    // Salvar no cache global
    globalPaymentConfirmations.set(external_id, simulatedConfirmation)
    console.log(`✅ Pagamento simulado salvo no cache global: ${external_id}`)

    // Simular webhook payload
    const simulatedWebhookPayload = {
      event: {
        type: "invoice.paid",
        created_at: new Date().toISOString(),
      },
      invoices: {
        id: simulatedConfirmation.invoiceId,
        external_id: external_id,
        status: {
          code: 5,
          title: "Pago",
          description: "Pagamento confirmado via simulação",
        },
        prices: {
          total: Math.round(simulatedConfirmation.amount * 100), // Em centavos
        },
        payment: {
          payDate: simulatedConfirmation.paymentDate,
          gateway: "pix",
          payId: `SIM_PAY_${Date.now()}`,
        },
      },
    }

    console.log("📤 Simulando webhook payload:", JSON.stringify(simulatedWebhookPayload, null, 2))

    // Simular processamento do webhook
    try {
      const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SuperPayBR-Simulation/1.0",
        },
        body: JSON.stringify(simulatedWebhookPayload),
      })

      if (webhookResponse.ok) {
        console.log("✅ Webhook simulado processado com sucesso")
      } else {
        console.log("⚠️ Erro ao processar webhook simulado:", webhookResponse.status)
      }
    } catch (webhookError) {
      console.log("⚠️ Erro ao enviar webhook simulado:", webhookError)
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: simulatedConfirmation,
      webhook_payload: simulatedWebhookPayload,
      redirect_url: redirect_type === "activation" ? "/upp10" : "/upp/001",
    })
  } catch (error) {
    console.log("❌ Erro na simulação de pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
