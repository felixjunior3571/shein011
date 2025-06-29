import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🎭 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { externalId, amount } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento para:", externalId)

    // Simular webhook de pagamento aprovado
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString(),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: externalId,
        status: {
          code: 5,
          title: "Pagamento Confirmado!",
          description: "Pagamento simulado aprovado",
        },
        prices: {
          total: amount || 3490, // em centavos
          discount: 0,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPayBR",
          payDate: new Date().toISOString(),
          details: {
            pix_code: "simulated_pix_code",
            qrcode: "simulated_qr_code",
          },
        },
      },
    }

    // Salvar no Supabase como pagamento aprovado
    const { data: savedData, error: supabaseError } = await supabase
      .from("payments")
      .upsert(
        {
          external_id: externalId,
          status: "Pagamento Confirmado!",
          amount: typeof amount === "number" ? amount / 100 : Number.parseFloat(amount?.toString() || "34.90"),
          is_paid: true,
          is_denied: false,
          is_expired: false,
          is_canceled: false,
          is_refunded: false,
          payment_date: new Date().toISOString(),
          webhook_data: simulatedWebhookData,
          provider: "superpaybr",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      )
      .select()

    if (supabaseError) {
      console.error("❌ Erro ao salvar simulação no Supabase:", supabaseError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar simulação",
          details: supabaseError.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Pagamento simulado e salvo:", savedData)

    // Simular chamada do webhook
    try {
      await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simulatedWebhookData),
      })
    } catch (webhookError) {
      console.log("⚠️ Erro ao chamar webhook simulado:", webhookError)
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        external_id: externalId,
        status: "Pagamento Confirmado!",
        is_paid: true,
        amount: amount || 3490,
        simulated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao simular pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
