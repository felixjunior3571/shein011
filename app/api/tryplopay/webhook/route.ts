import { type NextRequest, NextResponse } from "next/server"
import { getGlobalInvoices } from "../create-invoice/route"

// Sistema de eventos em tempo real
const eventListeners = new Map()

// Função para notificar listeners
function notifyListeners(externalId: string, data: any) {
  const listeners = eventListeners.get(externalId) || []
  listeners.forEach((listener: any) => {
    try {
      listener(data)
    } catch (error) {
      console.error("[WEBHOOK] Erro ao notificar listener:", error)
    }
  })
}

// Função para adicionar listener
export function addEventListener(externalId: string, callback: Function) {
  if (!eventListeners.has(externalId)) {
    eventListeners.set(externalId, [])
  }
  eventListeners.get(externalId).push(callback)
}

// Função para remover listener
export function removeEventListener(externalId: string, callback: Function) {
  const listeners = eventListeners.get(externalId) || []
  const index = listeners.indexOf(callback)
  if (index > -1) {
    listeners.splice(index, 1)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[WEBHOOK] Webhook recebido:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook
    if (!body.event || !body.invoices) {
      console.error("[WEBHOOK] Estrutura inválida do webhook")
      return NextResponse.json({ success: false, error: "Estrutura inválida" }, { status: 400 })
    }

    const { event, invoices } = body
    const externalId = invoices.external_id

    if (!externalId) {
      console.error("[WEBHOOK] External ID não encontrado")
      return NextResponse.json({ success: false, error: "External ID não encontrado" }, { status: 400 })
    }

    // Obter dados da invoice global
    const globalInvoices = getGlobalInvoices()
    const invoice = globalInvoices.get(externalId)

    if (!invoice) {
      console.error(`[WEBHOOK] Invoice não encontrada: ${externalId}`)
      return NextResponse.json({ success: false, error: "Invoice não encontrada" }, { status: 404 })
    }

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "invoice.update":
        console.log(`[WEBHOOK] Atualizando status da invoice ${externalId}`)

        // Atualizar dados da invoice
        invoice.status = invoices.status
        invoice.payment = { ...invoice.payment, ...invoices.payment }
        invoice.updated_at = new Date().toISOString()

        // Processar status específicos
        switch (invoices.status.code) {
          case 5: // Pagamento Confirmado
            console.log(`[WEBHOOK] ✅ Pagamento CONFIRMADO para ${externalId}`)
            invoice.paid = true
            invoice.paid_at = new Date().toISOString()

            // Notificar listeners em tempo real
            notifyListeners(externalId, {
              type: "payment_confirmed",
              externalId,
              status: "paid",
              paid: true,
              amount: invoice.amount,
              paid_at: invoice.paid_at,
            })
            break

          case 6: // Cancelado
            console.log(`[WEBHOOK] ❌ Pagamento CANCELADO para ${externalId}`)
            invoice.cancelled = true
            invoice.cancelled_at = new Date().toISOString()

            notifyListeners(externalId, {
              type: "payment_cancelled",
              externalId,
              status: "cancelled",
              cancelled: true,
            })
            break

          case 7: // Estornado
            console.log(`[WEBHOOK] 🔄 Pagamento ESTORNADO para ${externalId}`)
            invoice.refunded = true
            invoice.refunded_at = new Date().toISOString()

            notifyListeners(externalId, {
              type: "payment_refunded",
              externalId,
              status: "refunded",
              refunded: true,
            })
            break

          case 3: // Pendente
            console.log(`[WEBHOOK] ⏳ Pagamento PENDENTE para ${externalId}`)
            notifyListeners(externalId, {
              type: "payment_pending",
              externalId,
              status: "pending",
            })
            break

          case 1: // Aguardando
            console.log(`[WEBHOOK] ⏰ Aguardando pagamento para ${externalId}`)
            notifyListeners(externalId, {
              type: "payment_waiting",
              externalId,
              status: "waiting",
            })
            break

          default:
            console.log(`[WEBHOOK] Status desconhecido ${invoices.status.code} para ${externalId}`)
        }

        // Salvar dados atualizados
        globalInvoices.set(externalId, invoice)
        break

      default:
        console.log(`[WEBHOOK] Tipo de evento não processado: ${event.type}`)
    }

    // Resposta de sucesso para TryploPay
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[WEBHOOK] Erro ao processar webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// Método OPTIONS para validação do webhook
export async function OPTIONS(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // Decodificar token base64
    try {
      const decoded = Buffer.from(token, "base64").toString("utf-8")
      const [userId, webhookToken] = decoded.split(":")

      console.log(`[WEBHOOK_VALIDATION] Validando token para usuário ${userId}`)

      // Aqui você pode implementar validação adicional se necessário
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("[WEBHOOK_VALIDATION] Erro ao decodificar token:", error)
      return NextResponse.json({ success: false }, { status: 404 })
    }
  } catch (error) {
    console.error("[WEBHOOK_VALIDATION] Erro na validação:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
