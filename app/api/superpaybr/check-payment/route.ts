import { type NextRequest, NextResponse } from "next/server"
import { paymentConfirmations } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Verificação rápida de pagamento SuperPayBR: ${externalId}`)

    // Consultar apenas memória global (mais rápido)
    const paymentData = paymentConfirmations.get(externalId)

    if (paymentData && paymentData.isPaid) {
      console.log(`✅ Pagamento confirmado: ${externalId}`)
      return NextResponse.json({
        success: true,
        isPaid: true,
        statusName: paymentData.statusName,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        timestamp: paymentData.timestamp,
      })
    }

    console.log(`ℹ️ Pagamento não confirmado: ${externalId}`)
    return NextResponse.json({
      success: true,
      isPaid: false,
      statusName: "Aguardando Pagamento",
      amount: 0,
      paymentDate: null,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Use GET para verificar pagamento",
    timestamp: new Date().toISOString(),
  })
}
