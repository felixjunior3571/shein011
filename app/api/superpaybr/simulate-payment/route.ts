import { type NextRequest, NextResponse } from "next/server"

// Importar armazenamento global do webhook
import { paymentConfirmations } from "./webhook/route"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const { external_id, amount } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório para simulação",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento SuperPayBR:", {
      external_id,
      amount: Number.parseFloat(amount || "34.90"),
    })

    // Criar dados de pagamento simulado (formato TryploPay)
    const simulatedPaymentData = {
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5, // SuperPayBR: 5 = Pago
      statusName: "Pago (Simulado)",
      amount: Number.parseFloat(amount || "34.90"),
      paymentDate: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      externalId: external_id,
      invoiceId: `SIM_${external_id}`,
      clientName: "Cliente Simulado",
      clientDocument: "00000000000",
      clientEmail: "simulado@shein.com",
      simulated: true,
    }

    // Salvar em memória global (igual webhook real)
    paymentConfirmations.set(external_id, simulatedPaymentData)
    paymentConfirmations.set(`SIM_${external_id}`, simulatedPaymentData)

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")
    console.log(`💾 Salvo em memória para: ${external_id}`)

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      data: simulatedPaymentData,
      external_id: external_id,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na simulação SuperPayBR",
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
    simulations_count: Array.from(paymentConfirmations.values()).filter((p) => p.simulated).length,
  })
}
