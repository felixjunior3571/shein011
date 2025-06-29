import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Verificando pagamento SuperPayBR: ${externalId}`)

    // Redirecionar para o endpoint de status mais robusto
    const statusResponse = await fetch(
      `${request.nextUrl.origin}/api/superpaybr/payment-status?external_id=${externalId}`,
    )
    const statusData = await statusResponse.json()

    if (statusData.success) {
      return NextResponse.json({
        success: true,
        isPaid: statusData.isPaid,
        isDenied: statusData.isDenied,
        isRefunded: statusData.isRefunded,
        isExpired: statusData.isExpired,
        isCanceled: statusData.isCanceled,
        statusCode: statusData.statusCode,
        statusName: statusData.statusName,
        amount: statusData.amount,
        paymentDate: statusData.paymentDate,
        timestamp: statusData.timestamp,
        source: statusData.source,
      })
    } else {
      throw new Error(statusData.error || "Erro ao verificar status")
    }
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
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
