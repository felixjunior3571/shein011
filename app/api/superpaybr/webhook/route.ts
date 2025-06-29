import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(body, null, 2))

    // Headers do webhook
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers do webhook:", headers)

    // Extrair dados do webhook SuperPayBR
    const webhookData = {
      id: body.id || body.payment_id || body.invoice_id,
      external_id: body.external_id || body.reference || body.order_id,
      status: body.status || body.payment_status,
      status_code: body.status_code || body.code,
      status_name: body.status_name || body.status_text || body.message,
      amount: body.amount || body.value || body.total,
      payment_date: body.payment_date || body.paid_at || body.created_at,
      payment_method: body.payment_method || "pix",
      customer_name: body.customer?.name || body.client?.name,
      customer_email: body.customer?.email || body.client?.email,
      raw_data: body,
    }

    console.log("🔍 Dados extraídos do webhook:", webhookData)

    // Determinar status do pagamento
    let isPaid = false
    let isDenied = false
    let isExpired = false
    let isCanceled = false
    let isRefunded = false

    // SuperPayBR status codes (ajustar conforme documentação)
    const statusCode = Number.parseInt(webhookData.status_code?.toString() || "0")

    switch (statusCode) {
      case 5: // Pago
      case 200: // Aprovado
        isPaid = true
        break
      case 3: // Negado
      case 400: // Rejeitado
        isDenied = true
        break
      case 6: // Expirado
      case 408: // Timeout
        isExpired = true
        break
      case 7: // Cancelado
      case 499: // Cancelado
        isCanceled = true
        break
      case 8: // Estornado
      case 201: // Refunded
        isRefunded = true
        break
    }

    console.log("📊 Status do pagamento:", {
      statusCode,
      isPaid,
      isDenied,
      isExpired,
      isCanceled,
      isRefunded,
    })

    // Salvar no Supabase
    try {
      const { data, error } = await supabase.from("superpaybr_payments").insert({
        external_id: webhookData.external_id,
        invoice_id: webhookData.id,
        status_code: statusCode,
        status_name: webhookData.status_name,
        amount: Number.parseFloat(webhookData.amount?.toString() || "0"),
        payment_date: webhookData.payment_date,
        customer_name: webhookData.customer_name,
        customer_email: webhookData.customer_email,
        is_paid: isPaid,
        is_denied: isDenied,
        is_expired: isExpired,
        is_canceled: isCanceled,
        is_refunded: isRefunded,
        raw_webhook_data: webhookData.raw_data,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("❌ Erro ao salvar no Supabase:", error)
      } else {
        console.log("✅ Webhook salvo no Supabase:", data)
      }
    } catch (supabaseError) {
      console.error("❌ Erro de conexão Supabase:", supabaseError)
    }

    // Salvar no localStorage do cliente (via broadcast)
    if (webhookData.external_id) {
      const clientData = {
        isPaid,
        isDenied,
        isRefunded,
        isExpired,
        isCanceled,
        statusCode,
        statusName: webhookData.status_name,
        amount: Number.parseFloat(webhookData.amount?.toString() || "0"),
        paymentDate: webhookData.payment_date,
        lastUpdate: new Date().toISOString(),
      }

      console.log(`💾 Dados para localStorage: webhook_payment_${webhookData.external_id}`)
      console.log("📋 Dados do cliente:", clientData)

      // Broadcast para clientes conectados (se implementado)
      try {
        await supabase.from("payment_updates").insert({
          external_id: webhookData.external_id,
          payment_data: clientData,
          created_at: new Date().toISOString(),
        })
      } catch (broadcastError) {
        console.log("⚠️ Erro no broadcast (não crítico):", broadcastError)
      }
    }

    // Log do resultado
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO EXPIRADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isRefunded) {
      console.log("💸 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
    } else {
      console.log("📋 WEBHOOK SUPERPAYBR PROCESSADO (status pendente)")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      processed_data: {
        external_id: webhookData.external_id,
        status: {
          isPaid,
          isDenied,
          isExpired,
          isCanceled,
          isRefunded,
        },
        amount: webhookData.amount,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Webhooks devem usar POST.",
    },
    { status: 405 },
  )
}
