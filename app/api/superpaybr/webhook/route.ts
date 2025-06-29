import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📥 Dados webhook:", JSON.stringify(webhookData, null, 2))

    // Extrair dados do webhook
    const invoiceId = webhookData.invoice_id || webhookData.id || webhookData.external_id
    const status = webhookData.status || webhookData.payment_status || "unknown"
    const amount = webhookData.amount || webhookData.value || 0
    const paymentMethod = webhookData.payment_method || "pix"

    // Salvar no Supabase
    const { data, error } = await supabase.from("superpaybr_payments").upsert(
      {
        invoice_id: invoiceId,
        external_id: webhookData.external_id || invoiceId,
        status: status,
        amount: amount,
        payment_method: paymentMethod,
        webhook_data: webhookData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "invoice_id",
      },
    )

    if (error) {
      console.error("❌ Erro ao salvar webhook no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar webhook",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Broadcast atualização
    await supabase.from("payment_updates").insert({
      invoice_id: invoiceId,
      status: status,
      amount: amount,
      timestamp: new Date().toISOString(),
    })

    console.log("✅ Webhook SuperPayBR processado com sucesso")

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      invoice_id: invoiceId,
      status: status,
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
