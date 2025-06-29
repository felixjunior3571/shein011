import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória para evitar rate limits
const webhookStorage = new Map<string, any>()

export function getWebhookData(externalId: string) {
  return webhookStorage.get(externalId) || null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("🔔 Webhook SuperPayBR recebido:", JSON.stringify(body, null, 2))

    const externalId = body.external_id || body.data?.external_id

    if (!externalId) {
      console.error("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID obrigatório" }, { status: 400 })
    }

    // Processar dados do webhook
    const webhookData = {
      external_id: externalId,
      status: body.status || body.data?.status || { code: 1, text: "pending", title: "Aguardando Pagamento" },
      amount: body.amount || body.data?.amount || 0,
      payment_date: body.payment_date || body.data?.payment_date,
      timestamp: new Date().toISOString(),
      raw_data: body,
    }

    // Salvar em memória global (acesso rápido, sem rate limit)
    webhookStorage.set(externalId, webhookData)
    console.log(`💾 Webhook salvo em memória: ${externalId}`)

    // Backup no Supabase (assíncrono)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      await supabase.from("superpaybr_webhooks").upsert({
        external_id: externalId,
        status_code: webhookData.status.code,
        status_text: webhookData.status.text,
        status_title: webhookData.status.title,
        amount: webhookData.amount,
        payment_date: webhookData.payment_date,
        raw_data: webhookData.raw_data,
        created_at: new Date().toISOString(),
      })

      console.log(`💾 Backup Supabase salvo: ${externalId}`)
    } catch (supabaseError) {
      console.error("⚠️ Erro no backup Supabase:", supabaseError)
      // Não falhar o webhook por erro de backup
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      timestamp: webhookData.timestamp,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
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
    message: "Webhook SuperPayBR ativo",
    stored_payments: webhookStorage.size,
    timestamp: new Date().toISOString(),
  })
}
