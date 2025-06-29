import { type NextRequest, NextResponse } from "next/server"
import { globalPaymentStorage } from "../webhook/route"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Simulando pagamento SuperPayBR...")

    const { external_id, status = "paid" } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    // Mapear status para códigos SuperPayBR
    const statusMapping = {
      paid: { code: 5, name: "paid", title: "Pagamento Confirmado" },
      denied: { code: 7, name: "denied", title: "Pagamento Negado" },
      expired: { code: 9, name: "expired", title: "Pagamento Vencido" },
      canceled: { code: 6, name: "canceled", title: "Pagamento Cancelado" },
      refunded: { code: 8, name: "refunded", title: "Pagamento Estornado" },
    }

    const statusInfo = statusMapping[status as keyof typeof statusMapping] || statusMapping.paid

    // Simular dados do pagamento
    const simulatedPayment = {
      external_id: external_id,
      invoice_id: external_id,
      status: {
        code: statusInfo.code,
        text: statusInfo.name,
        title: statusInfo.title,
      },
      amount: 34.9,
      payment_date: status === "paid" ? new Date().toISOString() : null,
      is_paid: status === "paid",
      is_denied: status === "denied",
      is_expired: status === "expired",
      is_canceled: status === "canceled",
      is_refunded: status === "refunded",
      webhook_received_at: new Date().toISOString(),
      simulated: true,
    }

    // Salvar no armazenamento global
    globalPaymentStorage.set(external_id, simulatedPayment)

    console.log(`✅ Pagamento simulado: ${external_id} - ${statusInfo.title}`)

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: simulatedPayment,
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
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
  })
}
