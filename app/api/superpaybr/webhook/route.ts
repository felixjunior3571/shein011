import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    const eventType = body.event || body.type || "unknown"
    const invoiceData = body.data || body.invoice || body
    const externalId = invoiceData.external_id || invoiceData.id
    const status = invoiceData.status || {}
    const amount = invoiceData.amount || invoiceData.value || 0

    console.log("📋 Dados extraídos:", {
      eventType,
      externalId,
      status: status.code || status.name,
      amount,
    })

    if (!externalId) {
      console.error("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID não encontrado" }, { status: 400 })
    }

    // Determinar status do pagamento
    let isPaid = false
    let isDenied = false
    let isRefunded = false
    let isExpired = false
    let isCanceled = false
    const statusCode = status.code || 0
    let statusName = status.name || status.title || "Desconhecido"

    // Mapear status SuperPayBR
    switch (statusCode) {
      case 5: // Pago
        isPaid = true
        statusName = "Pagamento Confirmado!"
        break
      case 3: // Negado
        isDenied = true
        statusName = "Pagamento Negado"
        break
      case 6: // Estornado
        isRefunded = true
        statusName = "Pagamento Estornado"
        break
      case 7: // Vencido
        isExpired = true
        statusName = "Pagamento Vencido"
        break
      case 8: // Cancelado
        isCanceled = true
        statusName = "Pagamento Cancelado"
        break
      default:
        statusName = "Aguardando Pagamento"
    }

    console.log("🔍 Status processado:", {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName,
    })

    // Salvar no Supabase
    const { data: savedData, error: saveError } = await supabase.from("superpaybr_payments").upsert(
      {
        external_id: externalId,
        invoice_id: invoiceData.id || invoiceData.invoice_id,
        status_code: statusCode,
        status_name: statusName,
        amount: Number.parseFloat(amount.toString()),
        is_paid: isPaid,
        is_denied: isDenied,
        is_refunded: isRefunded,
        is_expired: isExpired,
        is_canceled: isCanceled,
        webhook_data: body,
        payment_date: isPaid ? new Date().toISOString() : null,
        processed_at: new Date().toISOString(),
      },
      {
        onConflict: "external_id",
      },
    )

    if (saveError) {
      console.error("❌ Erro ao salvar no Supabase:", saveError)
    } else {
      console.log("✅ Webhook salvo no Supabase:", savedData)
    }

    // Broadcast para clientes conectados
    const broadcastData = {
      external_id: externalId,
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName,
      amount: Number.parseFloat(amount.toString()),
      paymentDate: isPaid ? new Date().toISOString() : null,
    }

    const { error: broadcastError } = await supabase.from("payment_updates").insert({
      external_id: externalId,
      update_data: broadcastData,
      created_at: new Date().toISOString(),
    })

    if (broadcastError) {
      console.error("❌ Erro no broadcast:", broadcastError)
    } else {
      console.log("📡 Broadcast enviado:", broadcastData)
    }

    // Salvar no localStorage via broadcast (para monitoramento client-side)
    if (typeof window !== "undefined") {
      localStorage.setItem(`webhook_payment_${externalId}`, JSON.stringify(broadcastData))
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id: externalId,
        status: statusName,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook",
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
