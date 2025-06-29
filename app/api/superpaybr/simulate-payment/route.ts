import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount = 27.97, status = "paid" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🧪 Simulando pagamento:", { external_id, amount, status })

    // Determinar códigos baseado no status
    let statusCode = 1
    let statusTitle = "Aguardando Pagamento"
    let isPaid = false
    let isDenied = false
    let isExpired = false

    switch (status) {
      case "paid":
        statusCode = 5
        statusTitle = "Pagamento Confirmado!"
        isPaid = true
        break
      case "denied":
        statusCode = 6
        statusTitle = "Pagamento Negado"
        isDenied = true
        break
      case "expired":
        statusCode = 7
        statusTitle = "Pagamento Vencido"
        isExpired = true
        break
    }

    // Simular dados do webhook SuperPayBR
    const simulatedWebhookData = {
      external_id,
      invoice_id: `SIM_${external_id}`,
      provider: "superpaybr",
      status_code: statusCode,
      status_name: status,
      status_title: statusTitle,
      amount: Number.parseFloat(amount.toString()),
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: false,
      is_refunded: false,
      payment_date: isPaid ? new Date().toISOString() : null,
      webhook_data: {
        event: { type: "invoice.update", date: new Date().toISOString() },
        invoices: {
          id: `SIM_${external_id}`,
          external_id,
          status: { code: statusCode, title: statusTitle, text: status },
          valores: { bruto: Math.round(Number.parseFloat(amount.toString()) * 100) },
        },
        simulated: true,
      },
      processed_at: new Date().toISOString(),
    }

    console.log("💾 Salvando simulação no Supabase:", simulatedWebhookData)

    // Salvar no Supabase
    const { data, error } = await supabase.from("payment_webhooks").upsert(simulatedWebhookData, {
      onConflict: "external_id,provider",
    })

    if (error) {
      console.log("❌ Erro ao salvar simulação:", error)
      return NextResponse.json({ success: false, error: "Erro ao salvar simulação" }, { status: 500 })
    }

    console.log("✅ Pagamento SuperPayBR simulado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      data: simulatedWebhookData,
    })
  } catch (error) {
    console.log("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na simulação SuperPayBR",
      },
      { status: 500 },
    )
  }
}
