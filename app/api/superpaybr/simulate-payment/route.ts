import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Simulando pagamento SuperPayBR...")

    const body = await request.json()
    const { externalId, shouldPay = true } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🎭 Simulando pagamento para: ${externalId} (pago: ${shouldPay})`)

    // Simular webhook de pagamento
    const simulatedWebhook = {
      event: {
        type: "invoice.paid",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `sim_${Date.now()}`,
        external_id: externalId,
        token: `sim_token_${Math.random().toString(36).substring(2, 15)}`,
        status: {
          code: shouldPay ? 5 : 12, // 5 = pago, 12 = negado
          title: shouldPay ? "Pagamento Confirmado!" : "Pagamento Negado",
          text: shouldPay ? "paid" : "denied",
        },
        prices: {
          total: 34.9,
          discount: 0,
        },
        payment: {
          payDate: shouldPay ? new Date().toISOString() : null,
          gateway: "SuperPayBR",
        },
        type: "PIX",
      },
    }

    console.log("📤 Enviando webhook simulado...")

    // Processar webhook simulado
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulatedWebhook),
    })

    const webhookResult = await webhookResponse.json()

    if (!webhookResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha ao processar webhook simulado",
          details: webhookResult.error,
        },
        { status: 500 },
      )
    }

    console.log("✅ Pagamento simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: `Pagamento ${shouldPay ? "confirmado" : "negado"} via simulação`,
      data: {
        external_id: externalId,
        status: shouldPay ? "paid" : "denied",
        amount: 34.9,
        simulated: true,
        webhook_processed: true,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
