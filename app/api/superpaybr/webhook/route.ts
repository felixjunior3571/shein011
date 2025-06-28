import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Mapeamento de status SuperPayBR
const STATUS_MAP = {
  1: "pending", // Aguardando Pagamento
  2: "processing", // Em Processamento
  3: "scheduled", // Pagamento Agendado
  4: "authorized", // Autorizado
  5: "paid", // ✅ PAGO
  6: "canceled", // Cancelado
  7: "refund_pending", // Aguardando Estorno
  8: "partially_refunded", // Parcialmente Estornado
  9: "refunded", // Estornado
  10: "disputed", // Contestado/Em Contestação
  12: "denied", // ❌ PAGAMENTO NEGADO
  15: "expired", // ⏰ PAGAMENTO VENCIDO
  16: "error", // Erro no Pagamento
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📥 Dados do webhook SuperPayBR:", JSON.stringify(webhookData, null, 2))

    // Extrair dados do webhook SuperPayBR
    const { event, invoices } = webhookData

    if (!event || !invoices) {
      console.log("❌ Webhook SuperPayBR inválido - dados ausentes")
      return NextResponse.json({ error: "Invalid webhook data" }, { status: 400 })
    }

    const { id: invoiceId, external_id: externalId, status, prices, payment } = invoices

    console.log("🔍 Processando webhook SuperPayBR:", {
      event_type: event.type,
      invoice_id: invoiceId,
      external_id: externalId,
      status_code: status.code,
      status_title: status.title,
      amount: prices.total,
      payment_date: payment.payDate,
    })

    // Mapear status SuperPayBR
    const mappedStatus = STATUS_MAP[status.code] || "unknown"
    const isPaid = status.code === 5
    const isDenied = status.code === 12
    const isExpired = status.code === 15
    const isCanceled = status.code === 6
    const isRefunded = status.code === 9

    // Preparar dados para salvar
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: status.code,
      status_name: mappedStatus,
      status_title: status.title,
      amount: prices.total,
      payment_date: payment.payDate || null,
      webhook_data: webhookData,
      processed_at: new Date().toISOString(),
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
    }

    // Salvar no Supabase
    const { data, error } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id",
    })

    if (error) {
      console.log("❌ Erro ao salvar webhook SuperPayBR no Supabase:", error)
    } else {
      console.log("✅ Webhook SuperPayBR salvo no Supabase com sucesso!")
    }

    // Salvar também no localStorage para monitoramento puro
    if (typeof window !== "undefined" && externalId) {
      const paymentData = {
        isPaid,
        isDenied,
        isRefunded,
        isExpired,
        isCanceled,
        statusCode: status.code,
        statusName: mappedStatus,
        statusTitle: status.title,
        amount: prices.total,
        paymentDate: payment.payDate,
        processedAt: new Date().toISOString(),
      }

      localStorage.setItem(`webhook_payment_${externalId}`, JSON.stringify(paymentData))
      console.log("💾 Dados do pagamento salvos no localStorage:", externalId)
    }

    // Log do resultado
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${prices.total}`)
      console.log(`📅 Data: ${payment.payDate}`)
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    } else {
      console.log(`ℹ️ Status atualizado: ${status.title} (${mappedStatus})`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      status: mappedStatus,
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar webhook",
      },
      { status: 500 },
    )
  }
}

// Método OPTIONS para validação do webhook SuperPayBR
export async function OPTIONS(request: NextRequest) {
  try {
    console.log("=== VALIDAÇÃO WEBHOOK SUPERPAYBR ===")

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 400 })
    }

    console.log("🔍 Validando token SuperPayBR:", token)

    // Fazer autenticação para validar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json({ error: "Falha na autenticação" }, { status: 401 })
    }

    const accessToken = authResult.data.access_token

    // Validar token com SuperPayBR
    const validateResponse = await fetch("https://api.superpaybr.com/webhooks", {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    })

    if (validateResponse.ok) {
      console.log("✅ Token SuperPayBR válido!")
      return NextResponse.json({ success: true })
    } else {
      console.log("❌ Token SuperPayBR inválido!")
      return NextResponse.json({ error: "Token inválido" }, { status: 404 })
    }
  } catch (error) {
    console.log("❌ Erro na validação do webhook SuperPayBR:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
