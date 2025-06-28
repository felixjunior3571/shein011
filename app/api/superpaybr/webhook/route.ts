import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPayBR conforme documentação
const STATUS_MAP: Record<number, string> = {
  1: "pending", // Aguardando Pagamento
  2: "processing", // Em Processamento
  3: "scheduled", // Pagamento Agendado
  4: "authorized", // Autorizado
  5: "paid", // ✅ PAGO - Pagamento Confirmado!
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

    // Extrair dados do webhook SuperPayBR conforme documentação
    const { event, invoices } = webhookData

    if (!event || !invoices) {
      console.log("❌ Webhook SuperPayBR inválido - dados ausentes")
      return NextResponse.json({ error: "Invalid webhook data" }, { status: 400 })
    }

    const { id: invoiceId, external_id: externalId, status, prices, payment, token: webhookToken } = invoices

    console.log("🔍 Processando webhook SuperPayBR:", {
      event_type: event.type,
      event_date: event.date,
      invoice_id: invoiceId,
      external_id: externalId,
      status_code: status?.code,
      status_title: status?.title,
      status_description: status?.description,
      amount: prices?.total,
      payment_date: payment?.payDate,
      webhook_token: webhookToken,
    })

    if (!externalId) {
      console.log("⚠️ External ID não encontrado no webhook")
      return NextResponse.json({ received: true, message: "External ID não encontrado" })
    }

    // Mapear status SuperPayBR
    const statusCode = status?.code || 0
    const mappedStatus = STATUS_MAP[statusCode] || "unknown"
    const isPaid = statusCode === 5 // Pagamento Confirmado!
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9

    // Preparar dados para salvar no Supabase
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: mappedStatus,
      status_title: status?.title || "Unknown",
      status_description: status?.description || "",
      amount: prices?.total || 0, // SuperPayBR já retorna em centavos
      payment_date: payment?.payDate || null,
      payment_gateway: payment?.gateway || "SuperPay",
      payment_type: invoices.type || "PIX",
      webhook_data: webhookData,
      processed_at: new Date().toISOString(),
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
      provider: "superpaybr",
      webhook_token: webhookToken,
    }

    // Salvar no Supabase
    try {
      const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
        onConflict: "external_id",
      })

      if (dbError) {
        console.log("❌ Erro ao salvar webhook SuperPayBR no Supabase:", dbError)
      } else {
        console.log("✅ Webhook SuperPayBR salvo no Supabase com sucesso!")
      }
    } catch (dbError) {
      console.log("❌ Erro de conexão com Supabase:", dbError)
    }

    // Preparar dados para localStorage (monitoramento puro)
    const paymentData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName: mappedStatus,
      statusTitle: status?.title || "Unknown",
      statusDescription: status?.description || "",
      amount: prices?.total || 0,
      paymentDate: payment?.payDate || new Date().toISOString(),
      paymentGateway: payment?.gateway || "SuperPay",
      paymentType: invoices.type || "PIX",
      provider: "superpaybr",
      processedAt: new Date().toISOString(),
      externalId,
      invoiceId,
      webhookToken,
    }

    // Log do resultado baseado no status
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${(paymentData.amount / 100).toFixed(2)}`)
      console.log(`📅 Data: ${paymentData.paymentDate}`)
      console.log(`🔗 External ID: ${externalId}`)
      console.log(`🏦 Gateway: ${paymentData.paymentGateway}`)
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
    } else if (isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
    } else if (isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
    } else {
      console.log(`ℹ️ Status atualizado: ${status?.title} (${mappedStatus})`)
      console.log(`🔗 External ID: ${externalId}`)
    }

    // Resposta do webhook
    const response = NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      external_id: externalId,
      status: mappedStatus,
      is_paid: isPaid,
      webhook_data: paymentData,
    })

    // Adicionar headers para notificar o frontend
    response.headers.set("X-Payment-Status", mappedStatus)
    response.headers.set("X-External-ID", externalId)
    response.headers.set("X-Is-Paid", isPaid.toString())
    response.headers.set("X-Provider", "superpaybr")

    return response
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

// Método OPTIONS para validação do webhook SuperPayBR conforme documentação
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
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json({ error: "Falha na autenticação" }, { status: 401 })
    }

    const accessToken = authResult.data.access_token

    // Validar token com SuperPayBR conforme documentação
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
