import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Cache em memória para notificações ativas (otimização para múltiplos usuários)
export const activeNotifications = new Map<
  string,
  {
    external_id: string
    payment_confirmed: boolean
    status: string
    redirect_url: string | null
    redirect_type: string
    amount: number
    paid_at: string | null
    gateway?: string
    pay_id?: string
    webhook_received_at: string
    last_update: string
  }
>()

// Conexões SSE ativas
export const sseConnections = new Map<string, ReadableStreamDefaultController>()

// Cleanup automático de notificações antigas (executar a cada 5 minutos)
setInterval(
  () => {
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    for (const [key, notification] of activeNotifications.entries()) {
      const notificationTime = new Date(notification.webhook_received_at).getTime()
      if (notificationTime < fiveMinutesAgo) {
        console.log(`🧹 Removendo notificação expirada: ${key}`)
        activeNotifications.delete(key)
        sseConnections.delete(key)
      }
    }
  },
  5 * 60 * 1000,
)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPayBR recebido!")

    const body = await request.json()
    console.log("📦 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    const { external_id, status, amount, gateway, pay_id, paid_at, redirect_url, redirect_type = "checkout" } = body

    if (!external_id) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ error: "External ID obrigatório" }, { status: 400 })
    }

    const webhookData = {
      external_id,
      payment_confirmed: status === "pago" || status === "paid" || status === "approved",
      status: status || "pending",
      redirect_url: redirect_url || null,
      redirect_type: redirect_type || "checkout",
      amount: typeof amount === "number" ? amount : Number.parseFloat(amount) || 0,
      paid_at: paid_at || null,
      gateway: gateway || "superpaybr",
      pay_id: pay_id || null,
      webhook_received_at: new Date().toISOString(),
      last_update: new Date().toISOString(),
    }

    console.log(`📊 Processando webhook: ${external_id} - Status: ${status}`)

    // Salvar no cache em memória para acesso rápido
    activeNotifications.set(external_id, webhookData)
    console.log(`💾 Notificação salva no cache: ${external_id}`)

    // Salvar no banco de dados
    try {
      const { error: dbError } = await supabase.from("webhook_notifications").upsert({
        external_id,
        payment_confirmed: webhookData.payment_confirmed,
        status: webhookData.status,
        redirect_url: webhookData.redirect_url,
        redirect_type: webhookData.redirect_type,
        amount: webhookData.amount,
        paid_at: webhookData.paid_at,
        gateway: webhookData.gateway,
        pay_id: webhookData.pay_id,
        webhook_received_at: webhookData.webhook_received_at,
        last_update: webhookData.last_update,
        webhook_data: body,
      })

      if (dbError) {
        console.error("❌ Erro ao salvar no banco:", dbError)
      } else {
        console.log(`✅ Webhook salvo no banco: ${external_id}`)
      }
    } catch (dbError) {
      console.error("💥 Erro na operação do banco:", dbError)
    }

    // Enviar notificação via SSE se houver conexão ativa
    const sseController = sseConnections.get(external_id)
    if (sseController) {
      try {
        const sseData = `data: ${JSON.stringify({
          type: webhookData.payment_confirmed ? "payment_confirmed" : "payment_updated",
          external_id,
          status: webhookData.status,
          payment_confirmed: webhookData.payment_confirmed,
          redirect_url: webhookData.redirect_url,
          amount: webhookData.amount,
          paid_at: webhookData.paid_at,
          timestamp: webhookData.webhook_received_at,
        })}\n\n`

        sseController.enqueue(new TextEncoder().encode(sseData))
        console.log(`📡 Notificação SSE enviada: ${external_id}`)
      } catch (sseError) {
        console.error(`❌ Erro ao enviar SSE: ${sseError}`)
        sseConnections.delete(external_id)
      }
    } else {
      console.log(`📡 Nenhuma conexão SSE ativa para: ${external_id}`)
    }

    // Log do resultado
    if (webhookData.payment_confirmed) {
      console.log(`🎉 PAGAMENTO CONFIRMADO: ${external_id} - R$ ${webhookData.amount.toFixed(2)}`)
    } else {
      console.log(`📋 Status atualizado: ${external_id} - ${webhookData.status}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id,
        status: webhookData.status,
        payment_confirmed: webhookData.payment_confirmed,
        cached: true,
        sse_sent: !!sseController,
      },
    })
  } catch (error) {
    console.error("💥 Erro no webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Endpoint para obter estatísticas (usado pelo teste de escalabilidade)
export async function GET() {
  return NextResponse.json({
    success: true,
    stats: {
      active_notifications: activeNotifications.size,
      active_connections: sseConnections.size,
      cached_notifications: activeNotifications.size,
    },
    notifications: Array.from(activeNotifications.entries()).map(([key, value]) => ({
      external_id: key,
      status: value.status,
      payment_confirmed: value.payment_confirmed,
      webhook_received_at: value.webhook_received_at,
    })),
  })
}
