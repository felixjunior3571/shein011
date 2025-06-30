import { type NextRequest, NextResponse } from "next/server"
import { globalPaymentConfirmations } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMULAÇÃO DE PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount, redirect_type = "checkout" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🧪 Simulando pagamento para: ${external_id}`)
    console.log(`💰 Valor: R$ ${amount}`)
    console.log(`🔄 Tipo de redirecionamento: ${redirect_type}`)

    // Simular dados de pagamento confirmado
    const simulatedPaymentData = {
      isPaid: true,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
      statusCode: 5, // SuperPayBR: 5 = Pago
      statusName: "Pagamento Confirmado (Simulado)",
      amount: Number.parseFloat(amount) || 34.9,
      paymentDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      externalId: external_id,
      invoiceId: `SIM_${external_id}`,
      source: "simulation",
    }

    // Salvar no cache global
    globalPaymentConfirmations.set(external_id, simulatedPaymentData)
    console.log(`💾 Pagamento simulado salvo no cache: ${external_id}`)

    // Simular webhook (opcional - para logs)
    console.log("📤 Simulando recebimento de webhook...")
    console.log("✅ Webhook simulado processado")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: simulatedPaymentData,
      external_id,
      redirect_type,
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
