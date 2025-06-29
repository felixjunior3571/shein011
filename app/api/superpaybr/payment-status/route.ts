import { type NextRequest, NextResponse } from "next/server"
import { getPaymentData } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    console.log("🔍 Consultando status SuperPayBR:", externalId)

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    // Consultar dados do webhook em memória (sem rate limit)
    const paymentData = getPaymentData(externalId)

    if (!paymentData) {
      console.log("❌ Pagamento não encontrado na memória:", externalId)
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
        found: false,
      })
    }

    console.log("✅ Status encontrado:", {
      external_id: externalId,
      isPaid: paymentData.isPaid,
      status: paymentData.status_name,
    })

    return NextResponse.json({
      success: true,
      isPaid: paymentData.isPaid || false,
      isDenied: paymentData.isDenied || false,
      isRefunded: paymentData.isRefunded || false,
      isExpired: paymentData.isExpired || false,
      isCanceled: paymentData.isCanceled || false,
      statusCode: paymentData.status_code || 1,
      statusName: paymentData.status_name || "Aguardando Pagamento",
      amount: paymentData.amount || 0,
      paymentDate: paymentData.payment_date || null,
      timestamp: paymentData.timestamp || new Date().toISOString(),
      found: true,
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
