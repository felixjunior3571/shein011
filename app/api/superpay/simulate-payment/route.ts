import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Simulando pagamento SuperPay...")

    const body = await request.json()
    const { externalId, amount = 34.9, statusCode = 5 } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "externalId é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando webhook SuperPay:", {
      externalId,
      amount,
      statusCode,
    })

    // Simular webhook SuperPay
    const webhookData = {
      external_id: externalId,
      invoice_id: `INV_${Date.now()}`,
      status: statusCode,
      amount: amount,
      payment_date: statusCode === 5 ? new Date().toISOString() : null,
      customer_name: "Cliente Teste",
      customer_email: "teste@exemplo.com",
      payment_method: "pix",
      created_at: new Date().toISOString(),
    }

    // Enviar para o próprio webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/superpay/webhook`

    console.log("📤 Enviando para webhook SuperPay:", webhookUrl)

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookData),
    })

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status}`)
    }

    const webhookResult = await webhookResponse.json()
    console.log("✅ Webhook SuperPay simulado com sucesso:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      data: {
        external_id: externalId,
        status_code: statusCode,
        status_name: webhookResult.data?.status_name || `Status ${statusCode}`,
        amount: amount,
        token: webhookResult.data?.token,
        expires_at: webhookResult.data?.expires_at,
        webhook_sent: true,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Retornar 200 para evitar "Failed to fetch"
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Simulação SuperPay endpoint ativo",
    available_status: {
      1: "Aguardando Pagamento",
      2: "Em Processamento",
      5: "Pago",
      6: "Cancelado",
      9: "Estornado",
      12: "Negado",
      15: "Vencido",
    },
    timestamp: new Date().toISOString(),
  })
}
