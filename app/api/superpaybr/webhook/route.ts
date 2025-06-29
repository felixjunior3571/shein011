import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook
    const paymentId = body.id || body.payment_id || body.external_id || body.invoice_id
    const status = body.status || body.payment_status || "unknown"
    const amount = body.amount || body.value || 0

    console.log("📋 Dados extraídos:", {
      paymentId,
      status,
      amount,
    })

    if (!paymentId) {
      console.error("❌ ID do pagamento não encontrado no webhook")
      return NextResponse.json(
        {
          success: false,
          error: "ID do pagamento não encontrado",
        },
        { status: 400 },
      )
    }

    // Salvar no Supabase
    const { data, error } = await supabase
      .from("payments")
      .upsert(
        {
          payment_id: paymentId,
          status: status,
          amount: amount,
          provider: "superpaybr",
          webhook_data: body,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "payment_id",
        },
      )
      .select()

    if (error) {
      console.error("❌ Erro ao salvar no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar dados do pagamento",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Webhook processado com sucesso!")
    console.log("💾 Dados salvos:", data)

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      payment_id: paymentId,
      status: status,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPayBR está ativo",
    timestamp: new Date().toISOString(),
  })
}
