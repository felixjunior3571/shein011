import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_id, amount, redirect_type = "checkout" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🧪 Simulando pagamento SuperPayBR: ${external_id}`)

    // Simular webhook de pagamento aprovado
    const webhookData = {
      external_id,
      status: "pago",
      amount: amount || 34.9,
      gateway: "superpaybr",
      pay_id: `SIM_${Date.now()}`,
      paid_at: new Date().toISOString(),
      redirect_url: redirect_type === "checkout" ? "/upp/001" : "/upp10",
      redirect_type,
    }

    // Enviar para o próprio webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/superpaybr/webhook`

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookData),
    })

    const webhookResult = await webhookResponse.json()

    if (webhookResult.success) {
      console.log(`✅ Pagamento simulado com sucesso: ${external_id}`)
      return NextResponse.json({
        success: true,
        message: "Pagamento simulado com sucesso",
        data: {
          external_id,
          status: "pago",
          amount: webhookData.amount,
          redirect_url: webhookData.redirect_url,
          simulated: true,
        },
      })
    } else {
      throw new Error("Erro ao processar webhook simulado")
    }
  } catch (error) {
    console.error("❌ Erro na simulação:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro na simulação de pagamento",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
