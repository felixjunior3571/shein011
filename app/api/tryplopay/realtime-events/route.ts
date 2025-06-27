import { type NextRequest, NextResponse } from "next/server"
import { getGlobalInvoices } from "../create-invoice/route"

// Sistema de Server-Sent Events para tempo real
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const externalId = searchParams.get("externalId")

  if (!externalId) {
    return NextResponse.json(
      {
        error: "externalId é obrigatório",
      },
      { status: 400 },
    )
  }

  // Criar stream de eventos
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Função para enviar evento
      const sendEvent = (data: any) => {
        const eventData = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(eventData))
      }

      // Enviar evento inicial
      sendEvent({
        type: "connected",
        externalId,
        timestamp: new Date().toISOString(),
      })

      // Verificar status periodicamente
      const checkStatus = () => {
        const globalInvoices = getGlobalInvoices()
        const invoice = globalInvoices.get(externalId)

        if (invoice) {
          const eventData = {
            type: "status_update",
            externalId,
            status: invoice.status,
            paid: invoice.paid || invoice.status?.code === 5,
            cancelled: invoice.cancelled || invoice.status?.code === 6,
            refunded: invoice.refunded || invoice.status?.code === 7,
            amount: invoice.amount,
            timestamp: new Date().toISOString(),
            invoice_type: invoice.type,
          }

          sendEvent(eventData)

          // Se pago, cancelado ou estornado, fechar conexão
          if (invoice.paid || invoice.cancelled || invoice.refunded) {
            sendEvent({
              type: "final_status",
              externalId,
              final_status: invoice.paid ? "paid" : invoice.cancelled ? "cancelled" : "refunded",
              timestamp: new Date().toISOString(),
            })

            clearInterval(interval)
            controller.close()
            return
          }
        } else {
          sendEvent({
            type: "not_found",
            externalId,
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Verificar a cada 3 segundos
      const interval = setInterval(checkStatus, 3000)

      // Verificação inicial
      checkStatus()

      // Cleanup quando conexão for fechada
      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })

      // Timeout de 10 minutos
      setTimeout(
        () => {
          sendEvent({
            type: "timeout",
            externalId,
            message: "Conexão encerrada por timeout",
            timestamp: new Date().toISOString(),
          })
          clearInterval(interval)
          controller.close()
        },
        10 * 60 * 1000,
      )
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
