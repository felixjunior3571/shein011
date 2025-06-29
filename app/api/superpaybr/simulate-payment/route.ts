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

    console.log(`🎯 Simulando pagamento para: ${external_id}`)

    // Simular dados de pagamento confirmado
    const simulatedPaymentData = {
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5,
      statusName: "Pago",
      statusDescription: "Pagamento confirmado via simulação",
      amount: 34.9,
      paymentDate: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      externalId: external_id,
      invoiceId: `INV_${external_id}`,
      token: `TOKEN_${external_id}`,
      clientName: "Cliente Simulado",
      clientDocument: "12345678901",
      clientEmail: "simulado@teste.com",
      provider: "superpaybr",
      simulated: true,
    }

    // Salvar em memória global (igual webhook real)
    paymentConfirmations.set(external_id, simulatedPaymentData)
    paymentConfirmations.set(`INV_${external_id}`, simulatedPaymentData)
    paymentConfirmations.set(`TOKEN_${external_id}`, simulatedPaymentData)

    console.log(`✅ Pagamento simulado salvo em memória para: ${external_id}`)
    console.log(`📊 Total de confirmações: ${paymentConfirmations.size}`)

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      external_id: external_id,
      status: "Pago",
      amount: 34.9,
      simulated: true,
      timestamp: new Date().toISOString(),
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
