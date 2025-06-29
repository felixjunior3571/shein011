import { type NextRequest, NextResponse } from "next/server"
import { paymentConfirmations } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const { external_id } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento para:", external_id)

    // Simular dados de pagamento aprovado
    const simulatedPaymentData = {
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5,
      statusName: "Pago",
      statusDescription: "Pagamento aprovado via simulação",
      amount: 34.9,
      paymentDate: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      externalId: external_id,
      invoiceId: external_id,
      token: `token_${external_id}`,
      clientName: "Cliente Simulado",
      clientDocument: "00000000000",
      clientEmail: "simulado@teste.com",
      paymentDetails: {
        type: "pix",
        method: "simulation",
      },
      webhookData: {
        event: { type: "invoice.update", date: new Date().toISOString() },
        invoices: {
          id: external_id,
          external_id: external_id,
          status: { code: 5, title: "Pago", text: "paid" },
        },
      },
      provider: "superpaybr",
      simulated: true,
    }

    // Salvar na memória global (igual webhook real)
    paymentConfirmations.set(external_id, simulatedPaymentData)
    paymentConfirmations.set(`token_${external_id}`, simulatedPaymentData)

    console.log("✅ Pagamento simulado salvo na memória global")
    console.log(`📊 Total de confirmações: ${paymentConfirmations.size}`)

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      external_id: external_id,
      status: "paid",
      amount: simulatedPaymentData.amount,
      timestamp: simulatedPaymentData.timestamp,
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Simulate Payment endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
