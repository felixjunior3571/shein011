import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { activeNotifications, sseConnections } from "../webhook/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const externalId = searchParams.get("external_id")

  if (!externalId) {
    return new Response("external_id é obrigatório", { status: 400 })
  }

  console.log(`📡 Iniciando SSE stream para: ${externalId}`)

  // Criar stream SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log(`🔗 Cliente conectado via SSE: ${externalId}`)

      // Salvar conexão para envio de notificações
      sseConnections.set(externalId, controller)

      // Enviar evento inicial
      const initialData = `data: ${JSON.stringify({
        type: "connected",
        external_id: externalId,
        timestamp: new Date().toISOString(),
        message: "Conectado ao stream de pagamento",
      })}\n\n`

      controller.enqueue(new TextEncoder().encode(initialData))

      // Verificar se já existe notificação no cache
      const cachedNotification = activeNotifications.get(externalId)
      if (cachedNotification && cachedNotification.payment_confirmed) {
        console.log(`✅ Notificação em cache encontrada para: ${externalId}`)

        const paymentData = `data: ${JSON.stringify({
          type: "payment_confirmed",
          external_id: externalId,
          redirect_url: cachedNotification.redirect_url,
          amount: cachedNotification.amount,
          timestamp: cachedNotification.webhook_received_at,
        })}\n\n`

        controller.enqueue(new TextEncoder().encode(paymentData))
      }

      // Heartbeat para manter conexão viva
      const heartbeat = setInterval(() => {
        try {
          const heartbeatData = `data: ${JSON.stringify({
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          })}\n\n`

          controller.enqueue(new TextEncoder().encode(heartbeatData))
        } catch (error) {
          console.log(`💔 Heartbeat falhou para: ${externalId}`)
          clearInterval(heartbeat)
          sseConnections.delete(externalId)
        }
      }, 30000) // 30 segundos

      // Cleanup quando conexão for fechada
      request.signal.addEventListener("abort", () => {
        console.log(`🔌 Cliente desconectado: ${externalId}`)
        clearInterval(heartbeat)
        sseConnections.delete(externalId)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
