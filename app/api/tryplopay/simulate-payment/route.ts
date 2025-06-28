import { type NextRequest, NextResponse } from "next/server"
import { savePaymentConfirmation } from "@/lib/payment-storage"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULANDO PAGAMENTO APROVADO")

    const body = await request.json()
    const { externalId, amount = 34.9 } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🎯 Simulando pagamento para External ID: ${externalId}`)
    console.log(`💰 Valor: R$ ${amount}`)

    // Simular payload de webhook da TryploPay
    const simulatedWebhookPayload = {
      event: {
        type: "invoice.update" as const,
        date: new Date().toISOString(),
      },
      invoices: {
        id: Math.floor(Math.random() * 1000000),
        external_id: externalId,
        token: `simulated_token_${Date.now()}`,
        status: {
          code: 5, // PAGO
          title: "Pago",
          description: "Pagamento aprovado via simulação",
          text: "paid",
        },
        prices: {
          total: Number.parseFloat(amount.toString()),
        },
        payment: {
          gateway: "TRYPLOPAY",
          payId: `sim_pay_${Date.now()}`,
          payDate: new Date().toISOString(),
          details: {
            pix_code: "simulated_pix_code",
            qrcode: "simulated_qr_code",
          },
        },
      },
    }

    // Salvar confirmação usando a mesma lógica do webhook real
    const confirmationData = savePaymentConfirmation(
      externalId,
      simulatedWebhookPayload.invoices.id.toString(),
      simulatedWebhookPayload.invoices.token,
      {
        statusCode: 5,
        amount: Number.parseFloat(amount.toString()),
        paymentDate: new Date().toISOString(),
        statusDescription: "Pagamento aprovado via simulação",
        gateway: "TRYPLOPAY",
        payId: simulatedWebhookPayload.invoices.payment.payId,
        pixCode: simulatedWebhookPayload.invoices.payment.details.pix_code,
        qrCode: simulatedWebhookPayload.invoices.payment.details.qrcode,
        rawPayload: simulatedWebhookPayload,
      },
    )

    console.log("✅ Pagamento simulado com sucesso!")
    console.log("📋 Dados salvos:", confirmationData)

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        externalId,
        amount,
        isPaid: true,
        simulatedAt: new Date().toISOString(),
        confirmationData,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
