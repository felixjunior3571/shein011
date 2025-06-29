import { type NextRequest, NextResponse } from "next/server"

// Importar armazenamento global do webhook (igual TryploPay)
import { paymentConfirmations } from "./webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status SuperPayBR (memória):", externalId)

    // CONSULTAR APENAS MEMÓRIA GLOBAL (igual TryploPay - sem rate limit)
    const paymentData = paymentConfirmations.get(externalId)

    if (paymentData) {
      console.log("✅ Status SuperPayBR encontrado em memória!")
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
        message: "Status SuperPayBR obtido da memória",
        last_updated: paymentData.timestamp,
      })
    } else {
      console.log("ℹ️ Pagamento SuperPayBR não encontrado na memória:", externalId)
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
        message: "Pagamento não encontrado - aguardando webhook",
      })
    }
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao consultar status SuperPayBR",
      },
      { status: 500 },
    )
  }
}
