import { type NextRequest, NextResponse } from "next/server"
import { globalPaymentStorage } from "../webhook/route"

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

    console.log(`⚡ Verificação rápida SuperPayBR: ${externalId}`)

    // Consultar apenas armazenamento global (mais rápido)
    const paymentData = globalPaymentStorage.get(externalId)

    if (paymentData) {
      console.log(`✅ Pagamento encontrado: ${paymentData.status.text}`)

      return NextResponse.json({
        success: true,
        found: true,
        isPaid: paymentData.is_paid,
        isDenied: paymentData.is_denied,
        isExpired: paymentData.is_expired,
        isCanceled: paymentData.is_canceled,
        isRefunded: paymentData.is_refunded,
        status: paymentData.status.text,
        statusTitle: paymentData.status.title,
        amount: paymentData.amount,
        timestamp: paymentData.webhook_received_at,
      })
    }

    console.log(`ℹ️ Pagamento não encontrado: ${externalId}`)

    return NextResponse.json({
      success: true,
      found: false,
      isPaid: false,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
      status: "pending",
      statusTitle: "Aguardando Pagamento",
      amount: 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na verificação rápida SuperPayBR:", error)
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
