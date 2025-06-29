import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global para simulações
const globalWebhookStorage = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const { external_id, amount } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento para:", external_id)
    console.log("💰 Valor:", amount)

    // Simular webhook de pagamento aprovado
    const simulatedWebhook = {
      id: external_id,
      external_id: external_id,
      status: {
        code: 2,
        text: "paid",
        title: "Pagamento Aprovado",
        name: "approved",
      },
      amount: amount || 34.9,
      payment_date: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      raw_payload: {
        simulated: true,
        timestamp: new Date().toISOString(),
      },
    }

    // Salvar no armazenamento global
    globalWebhookStorage.set(external_id, {
      ...simulatedWebhook,
      timestamp: new Date().toISOString(),
      processed: true,
      simulated: true,
    })

    console.log("💾 Webhook simulado salvo no armazenamento global")

    // Salvar no Supabase como backup
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { error: insertError } = await supabase.from("superpaybr_webhooks").insert({
        external_id: external_id,
        webhook_data: simulatedWebhook,
        status: "paid",
        amount: amount || 34.9,
        created_at: new Date().toISOString(),
        simulated: true,
      })

      if (insertError) {
        console.log("⚠️ Erro ao salvar simulação no Supabase:", insertError.message)
      } else {
        console.log("✅ Simulação salva no Supabase")
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro no Supabase:", supabaseError)
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      external_id: external_id,
      amount: amount || 34.9,
      status: "paid",
      simulated: true,
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
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

// Exportar função para outros módulos
export function getSimulatedWebhookData(externalId: string) {
  return globalWebhookStorage.get(externalId) || null
}
