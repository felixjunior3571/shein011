import type { NextRequest } from "next/server"
import { getGlobalInvoices } from "../create-invoice/route"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    console.log("[REALTIME_EVENTS] Nova conexão SSE para:", externalId)

    if (!externalId) {
      console.log("[REALTIME_EVENTS] Erro: externalId não fornecido")
      return new Response("externalId é obrigatório", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Criar stream de Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        let intervalId: NodeJS.Timeout | null = null
        let checkCount = 0
        const maxChecks = 100 // 100 verificações = ~5 minutos (3 segundos cada)

        console.log(`[REALTIME_EVENTS] Iniciando stream para: ${externalId}`)

        // Função para enviar evento
        const sendEvent = (data: any) => {
          try {
            const eventData = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(eventData))
            console.log(`[REALTIME_EVENTS] Evento enviado:`, data.type)
          } catch (error) {
            console.error("[REALTIME_EVENTS] Erro ao enviar evento:", error)
          }
        }

        // Enviar evento de conexão
        sendEvent({
          type: "connected",
          externalId,
          timestamp: new Date().toISOString(),
          message: "Conectado aos eventos em tempo real",
        })

        // Função para verificar status
        const checkStatus = () => {
          try {
            checkCount++
            console.log(`[REALTIME_EVENTS] Verificação ${checkCount} para: ${externalId}`)

            const globalInvoices = getGlobalInvoices()
            const invoice = globalInvoices.get(externalId)

            if (invoice) {
              console.log(`[REALTIME_EVENTS] Status encontrado:`, {
                externalId,
                paid: invoice.paid,
                status: invoice.status,
              })

              const eventData = {
                type: "status_update",
                externalId,
                paid: invoice.paid || false,
                cancelled: invoice.cancelled || false,
                refunded: invoice.refunded || false,
                pending: !invoice.paid && !invoice.cancelled && !invoice.refunded,
                status: {
                  code: invoice.status || 1,
                  title: invoice.statusTitle || "Aguardando Pagamento",
                  description: invoice.statusDescription || "PIX gerado, aguardando pagamento",
                },
                amount: invoice.amount,
                invoice_type: invoice.type || "PIX",
                updated_at: invoice.updated_at || new Date().toISOString(),
                timestamp: new Date().toISOString(),
              }

              sendEvent(eventData)

              // Se pago, cancelado ou estornado, enviar evento final
              if (invoice.paid || invoice.cancelled || invoice.refunded) {
                const finalStatus = invoice.paid ? "paid" : invoice.cancelled ? "cancelled" : "refunded"

                sendEvent({
                  type: "final_status",
                  externalId,
                  final_status: finalStatus,
                  timestamp: new Date().toISOString(),
                  message: `Pagamento ${finalStatus === "paid" ? "confirmado" : finalStatus === "cancelled" ? "cancelado" : "estornado"}`,
                })

                console.log(`[REALTIME_EVENTS] Status final: ${finalStatus}. Fechando conexão.`)

                if (intervalId) {
                  clearInterval(intervalId)
                  intervalId = null
                }
                controller.close()
                return
              }
            } else {
              // Enviar heartbeat se não há dados
              sendEvent({
                type: "heartbeat",
                externalId,
                check: checkCount,
                timestamp: new Date().toISOString(),
                message: "Aguardando dados do pagamento...",
              })
            }

            // Timeout após máximo de verificações
            if (checkCount >= maxChecks) {
              sendEvent({
                type: "timeout",
                externalId,
                message: "Timeout após 5 minutos de verificação",
                timestamp: new Date().toISOString(),
              })

              console.log(`[REALTIME_EVENTS] Timeout para: ${externalId}`)

              if (intervalId) {
                clearInterval(intervalId)
                intervalId = null
              }
              controller.close()
            }
          } catch (error) {
            console.error(`[REALTIME_EVENTS] Erro na verificação:`, error)

            sendEvent({
              type: "error",
              externalId,
              error: error instanceof Error ? error.message : "Erro desconhecido",
              timestamp: new Date().toISOString(),
            })
          }
        }

        // Verificação inicial
        checkStatus()

        // Verificar a cada 3 segundos
        intervalId = setInterval(checkStatus, 3000)

        // Cleanup quando a conexão for fechada
        const cleanup = () => {
          console.log(`[REALTIME_EVENTS] Limpando conexão para: ${externalId}`)
          if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
          }
        }

        // Listener para abort
        request.signal?.addEventListener("abort", cleanup)

        // Timeout de segurança (10 minutos)
        setTimeout(
          () => {
            console.log(`[REALTIME_EVENTS] Timeout de segurança para: ${externalId}`)
            cleanup()
            controller.close()
          },
          10 * 60 * 1000,
        )
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
        "X-Accel-Buffering": "no", // Nginx
      },
    })
  } catch (error) {
    console.error("[REALTIME_EVENTS] Erro geral:", error)

    return new Response(
      JSON.stringify({
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
