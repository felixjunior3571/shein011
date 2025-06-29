import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount = 27.97 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🧪 Simulando pagamento SuperPayBR:", {
      external_id,
      amount,
    })

    // Simular dados do webhook SuperPayBR
    const simulatedWebhookData = {
      isPaid: true,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 5, // SuperPayBR: 5 = Pagamento Confirmado
      statusName: "Pagamento Confirmado!",
      amount: Number.parseFloat(amount.toString()),
      paymentDate: new Date().toISOString(),
      webhookData: {
        event: {
          type: "invoice.update",
          date: new Date().toISOString(),
        },
        invoices: {
          external_id,
          status: {
            code: 5,
            title: "Pagamento Confirmado!",
          },
          valores: {
            liquido: Math.round(Number.parseFloat(amount.toString()) * 100), // Centavos
          },
        },
      },
      provider: "superpaybr",
    }

    console.log("💾 Salvando simulação SuperPayBR no Supabase...")

    // Salvar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(
        {
          external_id,
          payment_data: simulatedWebhookData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )
      .select()

    if (error) {
      console.log("❌ Erro ao salvar simulação SuperPayBR:", error)
      return NextResponse.json({ success: false, error: "Erro ao salvar simulação" }, { status: 500 })
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso!",
      data: simulatedWebhookData,
      external_id,
    })
  } catch (error) {
    console.log("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao simular pagamento SuperPayBR",
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
