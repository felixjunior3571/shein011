import { type NextRequest, NextResponse } from "next/server"
import { getGlobalInvoices } from "../create-invoice/route"

// Armazenamento global de status de pagamento
const globalPaymentStatus = new Map<string, any>()

export function getGlobalPaymentStatus() {
  return globalPaymentStatus
}

export async function POST(request: NextRequest) {
  try {
    console.log("[WEBHOOK] Webhook recebido da TryploPay")

    // Verificar headers
    const headers = Object.fromEntries(request.headers)
    console.log("[WEBHOOK] Headers:", headers)

    // Ler body
    const body = await request.json()
    console.log("[WEBHOOK] Body recebido:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook conforme documentação TryploPay
    if (!body.event || !body.invoices) {
      console.error("[WEBHOOK] Estrutura inválida do webhook")
      return NextResponse.json({ error: "Estrutura inválida" }, { status: 400 })
    }

    const { event, invoices } = body
    const { type: eventType, date: eventDate } = event
    const {
      id: invoiceId,
      external_id: externalId,
      token,
      status,
      customer,
      prices,
      type: paymentType,
      payment,
    } = invoices

    console.log("[WEBHOOK] Processando evento:", {
      eventType,
      externalId,
      invoiceId,
      statusCode: status?.code,
      statusTitle: status?.title,
    })

    // Processar diferentes tipos de evento
    if (eventType === "invoice.update") {
      const globalInvoices = getGlobalInvoices()
      const existingInvoice = globalInvoices.get(externalId)

      // Determinar status baseado no código
      const isPaid = status?.code === 5 // Código 5 = Pagamento Confirmado
      const isCancelled = status?.code === 6 // Código 6 = Cancelado
      const isRefunded = status?.code === 7 // Código 7 = Estornado
      const isPending = status?.code === 3 || status?.code === 1 // Códigos 1,3 = Pendente

      // Atualizar invoice global
      if (existingInvoice) {
        existingInvoice.status = status?.code
        existingInvoice.statusTitle = status?.title
        existingInvoice.statusDescription = status?.description
        existingInvoice.paid = isPaid
        existingInvoice.cancelled = isCancelled
        existingInvoice.refunded = isRefunded
        existingInvoice.pending = isPending
        existingInvoice.updated_at = new Date().toISOString()
        existingInvoice.webhook_data = body

        console.log("[WEBHOOK] Invoice atualizada:", {
          externalId,
          paid: isPaid,
          cancelled: isCancelled,
          refunded: isRefunded,
        })
      }

      // Atualizar status global
      globalPaymentStatus.set(externalId, {
        externalId,
        invoiceId,
        token,
        status: status?.code,
        statusTitle: status?.title,
        statusDescription: status?.description,
        paid: isPaid,
        cancelled: isCancelled,
        refunded: isRefunded,
        pending: isPending,
        amount: prices?.total,
        type: paymentType,
        customer,
        payment,
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
        event_type: eventType,
        event_date: eventDate,
      })

      // Log do status crítico
      if (isPaid) {
        console.log(`[WEBHOOK] 🎉 PAGAMENTO CONFIRMADO para: ${externalId}`)
      } else if (isCancelled) {
        console.log(`[WEBHOOK] ❌ PAGAMENTO CANCELADO para: ${externalId}`)
      } else if (isRefunded) {
        console.log(`[WEBHOOK] 💸 PAGAMENTO ESTORNADO para: ${externalId}`)
      } else {
        console.log(`[WEBHOOK] ⏳ Status atualizado para: ${externalId} - ${status?.title}`)
      }

      return NextResponse.json({
        success: true,
        message: "Webhook processado com sucesso",
        externalId,
        status: status?.code,
        processed_at: new Date().toISOString(),
      })
    }

    // Outros tipos de evento
    console.log(`[WEBHOOK] Tipo de evento não processado: ${eventType}`)
    return NextResponse.json({
      success: true,
      message: "Evento recebido mas não processado",
      event_type: eventType,
    })
  } catch (error) {
    console.error("[WEBHOOK] Erro ao processar webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
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

    console.log("[WEBHOOK] Validação OPTIONS recebida:", { token })

    // Validar token conforme documentação TryploPay
    // O token vem em base64 e contém: "user_id:webhook_token"
    if (token) {
      try {
        const decoded = Buffer.from(token, "base64").toString("utf-8")
        const [userId, webhookToken] = decoded.split(":")

        console.log("[WEBHOOK] Token decodificado:", { userId, webhookToken })

        // Aqui você validaria o webhookToken com o que foi configurado
        // Por enquanto, aceitar qualquer token válido
        if (userId && webhookToken) {
          return NextResponse.json({ success: true })
        }
      } catch (decodeError) {
        console.error("[WEBHOOK] Erro ao decodificar token:", decodeError)
      }
    }

    return NextResponse.json({ success: false }, { status: 404 })
  } catch (error) {
    console.error("[WEBHOOK] Erro na validação OPTIONS:", error)
    return NextResponse.json({ success: false }, { status: 404 })
  }
}
