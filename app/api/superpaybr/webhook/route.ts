import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória (igual TryploPay)
const globalPaymentStorage = new Map<string, any>()

// Mapeamento de status SuperPayBR
const STATUS_MAPPING = {
  1: {
    name: "pending",
    title: "Aguardando Pagamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  2: {
    name: "paid",
    title: "Pagamento Confirmado",
    isPaid: true,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  3: {
    name: "denied",
    title: "Pagamento Negado",
    isPaid: false,
    isDenied: true,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  4: {
    name: "expired",
    title: "Pagamento Vencido",
    isPaid: false,
    isDenied: false,
    isExpired: true,
    isCanceled: false,
    isRefunded: false,
  },
  5: {
    name: "canceled",
    title: "Pagamento Cancelado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: true,
    isRefunded: false,
  },
  6: {
    name: "refunded",
    title: "Pagamento Estornado",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: true,
  },
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPayBR recebido")

    const body = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    const eventType = body.event || body.type
    const invoiceData = body.data || body.invoice || body

    if (!invoiceData) {
      console.log("⚠️ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: true, message: "Webhook processado (sem dados)" })
    }

    // Buscar external_id recursivamente
    let externalId = ""
    const findExternalId = (obj: any): void => {
      if (!obj || typeof obj !== "object") return

      for (const [key, value] of Object.entries(obj)) {
        if (key === "external_id" && typeof value === "string") {
          externalId = value
          return
        }
        if (key === "id" && typeof value === "string" && value.startsWith("SHEIN_")) {
          externalId = value
          return
        }
        if (typeof value === "object" && value !== null) {
          findExternalId(value)
        }
      }
    }

    findExternalId(invoiceData)

    if (!externalId) {
      console.log("⚠️ External ID não encontrado no webhook")
      return NextResponse.json({ success: true, message: "Webhook processado (sem external_id)" })
    }

    console.log("🆔 External ID encontrado:", externalId)

    // Extrair status
    const statusCode = invoiceData.status?.code || invoiceData.status || 1
    const statusInfo = STATUS_MAPPING[statusCode as keyof typeof STATUS_MAPPING] || STATUS_MAPPING[1]

    // Extrair valor
    const amount = invoiceData.amount || invoiceData.value || invoiceData.valores?.bruto || 0

    // Dados completos do pagamento
    const paymentData = {
      external_id: externalId,
      invoice_id: invoiceData.id || invoiceData.invoice_id || externalId,
      status: {
        code: statusCode,
        text: statusInfo.name,
        title: statusInfo.title,
      },
      amount: typeof amount === "number" ? amount : Number.parseFloat(amount.toString()) || 0,
      payment_date:
        invoiceData.payment_date || invoiceData.paid_at || (statusInfo.isPaid ? new Date().toISOString() : null),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      webhook_received_at: new Date().toISOString(),
      raw_data: invoiceData,
    }

    console.log("💾 Salvando no armazenamento global:", {
      external_id: externalId,
      status: statusInfo.name,
      amount: paymentData.amount,
    })

    // Salvar no armazenamento global (igual TryploPay)
    globalPaymentStorage.set(externalId, paymentData)

    // Backup no Supabase (assíncrono)
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      await supabase.from("superpaybr_webhooks").upsert({
        external_id: externalId,
        invoice_id: paymentData.invoice_id,
        status_code: statusCode,
        status_name: statusInfo.name,
        status_title: statusInfo.title,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        is_paid: statusInfo.isPaid,
        is_denied: statusInfo.isDenied,
        is_expired: statusInfo.isExpired,
        is_canceled: statusInfo.isCanceled,
        is_refunded: statusInfo.isRefunded,
        webhook_data: invoiceData,
        created_at: new Date().toISOString(),
      })

      console.log("✅ Backup no Supabase realizado")
    } catch (supabaseError) {
      console.error("⚠️ Erro no backup Supabase:", supabaseError)
      // Não falhar o webhook por erro de backup
    }

    console.log(`✅ Webhook SuperPayBR processado: ${statusInfo.name}`)

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      status: statusInfo.name,
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)

    // SEMPRE retornar 200 OK para evitar reenvios
    return NextResponse.json({
      success: true,
      message: "Webhook recebido (com erro interno)",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    storage_count: globalPaymentStorage.size,
    timestamp: new Date().toISOString(),
  })
}

// Exportar storage para outros endpoints
export { globalPaymentStorage }
