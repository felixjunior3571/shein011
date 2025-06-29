import { type NextRequest, NextResponse } from "next/server"
import { getWebhookData } from "../webhook/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Verificação rápida SuperPayBR: ${externalId}`)

    // Consultar apenas no storage global (sem rate limit)
    const webhookData = getWebhookData(externalId)

    if (!webhookData) {
      return NextResponse.json({
        success: true,
        found: false,
        is_paid: false,
        external_id: externalId,
        message: "Pagamento não encontrado",
      })
    }

    const status = webhookData.status || {}
    const isPaid = status.code === 2 || status.text === "paid" || status.text === "approved"

    return NextResponse.json({
      success: true,
      found: true,
      is_paid: isPaid,
      external_id: externalId,
      status: status.title || "Aguardando Pagamento",
      amount: webhookData.amount || 0,
      payment_date: webhookData.payment_date,
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
