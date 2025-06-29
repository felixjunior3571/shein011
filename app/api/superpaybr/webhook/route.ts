import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória para webhooks SuperPayBR
const globalWebhookStorage = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const payload = await request.json()
    console.log("📋 Payload completo:", JSON.stringify(payload, null, 2))

    // Extrair dados do webhook SuperPayBR
    const webhookData = {
      id: payload.id || payload.invoice_id || payload.external_id,
      external_id: payload.external_id || payload.id,
      status: payload.status || {},
      amount: payload.amount || payload.value || 0,
      payment_date: payload.payment_date || payload.paid_at || new Date().toISOString(),
      raw_payload: payload,
    }

    console.log("🔍 Dados extraídos do webhook:", {
      id: webhookData.id,
      external_id: webhookData.external_id,
      status: webhookData.status,
      amount: webhookData.amount,
    })

    // Salvar no armazenamento global
    if (webhookData.external_id) {
      globalWebhookStorage.set(webhookData.external_id, {
        ...webhookData,
        timestamp: new Date().toISOString(),
        processed: true,
      })
      console.log("💾 Webhook salvo no armazenamento global:", webhookData.external_id)
    }

    // Salvar no Supabase como backup
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { error: insertError } = await supabase.from("superpaybr_webhooks").insert({
        external_id: webhookData.external_id,
        webhook_data: webhookData,
        status: webhookData.status?.text || "unknown",
        amount: webhookData.amount,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.log("⚠️ Erro ao salvar no Supabase:", insertError.message)
      } else {
        console.log("✅ Webhook salvo no Supabase")
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro no Supabase:", supabaseError)
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso")

    return NextResponse.json({
      success: true,
      message: "Webhook processado",
      external_id: webhookData.external_id,
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
  const webhookCount = globalWebhookStorage.size
  const recentWebhooks = Array.from(globalWebhookStorage.entries())
    .slice(-5)
    .map(([key, value]) => ({
      external_id: key,
      timestamp: value.timestamp,
      status: value.status?.text || "unknown",
    }))

  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    webhook_count: webhookCount,
    recent_webhooks: recentWebhooks,
    timestamp: new Date().toISOString(),
  })
}

// Função para consultar webhook por external_id
export function getWebhookData(externalId: string) {
  return globalWebhookStorage.get(externalId) || null
}
