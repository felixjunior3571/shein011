import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPayBR
const STATUS_MAP = {
  1: { name: "pending", title: "Aguardando Pagamento" },
  2: { name: "processing", title: "Em Processamento" },
  3: { name: "scheduled", title: "Pagamento Agendado" },
  4: { name: "authorized", title: "Autorizado" },
  5: { name: "paid", title: "Pago" }, // ✅ PAGO
  6: { name: "canceled", title: "Cancelado" },
  7: { name: "refund_pending", title: "Aguardando Estorno" },
  8: { name: "partially_refunded", title: "Parcialmente Estornado" },
  9: { name: "refunded", title: "Estornado" },
  10: { name: "disputed", title: "Contestado/Em Contestação" },
  12: { name: "denied", title: "Pagamento Negado" }, // ❌ NEGADO
  15: { name: "expired", title: "Pagamento Vencido" }, // ⏰ VENCIDO
  16: { name: "error", title: "Erro no Pagamento" },
} as const

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Webhook SuperPayBR body:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook SuperPayBR
    if (!body.event || !body.invoices) {
      console.log("❌ Webhook SuperPayBR inválido - estrutura incorreta")
      return NextResponse.json({ error: "Invalid webhook structure" }, { status: 400 })
    }

    const { event, invoices } = body
    const invoice = invoices

    console.log("📋 Dados do webhook:")
    console.log("Event Type:", event.type)
    console.log("Invoice ID:", invoice.id)
    console.log("External ID:", invoice.external_id)
    console.log("Status Code:", invoice.status.code)
    console.log("Status Title:", invoice.status.title)

    // Mapear status SuperPayBR
    const statusInfo = STATUS_MAP[invoice.status.code as keyof typeof STATUS_MAP] || {
      name: "unknown",
      title: "Status Desconhecido",
    }

    const isPaid = invoice.status.code === 5 // SuperPayBR: 5 = Pago
    const isDenied = invoice.status.code === 12 // SuperPayBR: 12 = Negado
    const isExpired = invoice.status.code === 15 // SuperPayBR: 15 = Vencido
    const isCanceled = invoice.status.code === 6 // SuperPayBR: 6 = Cancelado

    console.log("🔍 Status processado:")
    console.log("isPaid:", isPaid)
    console.log("isDenied:", isDenied)
    console.log("isExpired:", isExpired)
    console.log("isCanceled:", isCanceled)

    // Salvar webhook no Supabase
    const webhookData = {
      external_id: invoice.external_id,
      invoice_id: invoice.id,
      status_code: invoice.status.code,
      status_name: statusInfo.name,
      status_title: statusInfo.title,
      amount: invoice.prices?.total || 0,
      payment_date: invoice.payment?.payDate || null,
      webhook_data: body,
      processed_at: new Date().toISOString(),
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      gateway: "superpaybr",
    }

    const { error: dbError } = await supabase.from("payment_webhooks").insert(webhookData)

    if (dbError) {
      console.log("❌ Erro ao salvar webhook SuperPayBR no banco:", dbError)
    } else {
      console.log("✅ Webhook SuperPayBR salvo no banco com sucesso")
    }

    // Salvar no localStorage para monitoramento em tempo real
    if (invoice.external_id) {
      const localStorageData = {
        isPaid,
        isDenied,
        isRefunded: invoice.status.code === 9,
        isExpired,
        isCanceled,
        statusCode: invoice.status.code,
        statusName: statusInfo.title,
        amount: (invoice.prices?.total || 0) / 100, // SuperPayBR retorna em centavos
        paymentDate: invoice.payment?.payDate || new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      }

      console.log("💾 Dados para localStorage:", localStorageData)
      console.log(`🔑 Chave localStorage: webhook_payment_${invoice.external_id}`)

      // Simular salvamento no localStorage (será capturado pelo hook)
      console.log(`✅ Webhook SuperPayBR processado para external_id: ${invoice.external_id}`)
    }

    return NextResponse.json({ success: true, status: "processed" })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Método OPTIONS para validação de webhook SuperPayBR
export async function OPTIONS(request: NextRequest) {
  try {
    console.log("=== VALIDAÇÃO WEBHOOK SUPERPAYBR ===")

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    console.log("🔍 Validando token webhook SuperPayBR:", token)

    // Obter access token para validação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authData = await authResponse.json()

    if (!authData.success) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    // Validar token com SuperPayBR
    const validateResponse = await fetch("https://api.superpaybr.com/webhooks", {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.data.access_token}`,
      },
      body: JSON.stringify({ token }),
    })

    if (validateResponse.ok) {
      console.log("✅ Token webhook SuperPayBR válido")
      return NextResponse.json({ success: true })
    } else {
      console.log("❌ Token webhook SuperPayBR inválido")
      return NextResponse.json({ success: false }, { status: 404 })
    }
  } catch (error) {
    console.log("❌ Erro na validação webhook SuperPayBR:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
