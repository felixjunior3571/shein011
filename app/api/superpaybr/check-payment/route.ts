import { type NextRequest, NextResponse } from "next/server"
import { getWebhookData } from "../webhook/route"

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

    console.log("🔍 Verificando pagamento SuperPayBR:", externalId)

    // Consultar no armazenamento global (sem rate limit)
    const webhookData = getWebhookData(externalId)

    if (webhookData) {
      console.log("✅ Dados encontrados no webhook SuperPayBR")

      const status = webhookData.status || {}
      const statusCode = status.code || status.status || 1
      const isPaid = statusCode === 2 || status.text === "paid" || status.text === "approved"

      return NextResponse.json({
        success: true,
        external_id: externalId,
        is_paid: isPaid,
        status: {
          code: statusCode,
          text: status.text || status.name || "pending",
          title: status.title || "Aguardando Pagamento",
        },
        amount: webhookData.amount || 0,
        payment_date: webhookData.payment_date,
        source: "webhook",
        timestamp: webhookData.timestamp,
      })
    }

    console.log("⚠️ Pagamento não encontrado no webhook SuperPayBR")

    return NextResponse.json({
      success: true,
      external_id: externalId,
      is_paid: false,
      status: {
        code: 1,
        text: "pending",
        title: "Aguardando Pagamento",
      },
      amount: 0,
      payment_date: null,
      source: "not_found",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        external_id: request.nextUrl.searchParams.get("external_id"),
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
