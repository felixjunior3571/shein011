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

    console.log(`🔍 Consultando status SuperPayBR para: ${externalId}`)

    // Consultar memória global (sem rate limit)
    const paymentData = paymentConfirmations.get(externalId)

    if (paymentData) {
      console.log(`✅ Status encontrado em memória: ${paymentData.statusName}`)

      return NextResponse.json({
        success: true,
        isPaid: paymentData.isPaid,
        isDenied: paymentData.isDenied,
        isRefunded: paymentData.isRefunded,
        isExpired: paymentData.isExpired,
        isCanceled: paymentData.isCanceled,
        statusCode: paymentData.statusCode,
        statusName: paymentData.statusName,
        amount: paymentData.amount,
        paymentDate: paymentData.paymentDate,
        timestamp: paymentData.timestamp,
        source: "memory",
      })
    }

    console.log(`ℹ️ Status não encontrado em memória para: ${externalId}`)

    // Retornar status padrão se não encontrado
    return NextResponse.json({
      success: true,
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 1,
      statusName: "Aguardando Pagamento",
      amount: 0,
      paymentDate: null,
      timestamp: new Date().toISOString(),
      source: "default",
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
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
    message: "Use GET para consultar status",
    timestamp: new Date().toISOString(),
  })
}
