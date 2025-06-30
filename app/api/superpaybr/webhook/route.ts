import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Cache global para confirmações de pagamento
export const globalPaymentConfirmations = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Payload do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook
    const { id: invoiceId, external_id: externalId, status, amount, payment, customer } = body

    if (!externalId) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID obrigatório" }, { status: 400 })
    }

    // Processar status do pagamento
    const statusCode = status?.code || 1
    const statusName = status?.title || "Desconhecido"

    const isPaid = statusCode === 5 // SuperPayBR: 5 = Pago
    const isDenied = statusCode === 12 // SuperPayBR: 12 = Negado
    const isExpired = statusCode === 15 // SuperPayBR: 15 = Expirado
    const isCanceled = statusCode === 6 // SuperPayBR: 6 = Cancelado
    const isRefunded = statusCode === 9 // SuperPayBR: 9 = Estornado

    console.log(`📊 Status processado: ${statusName} (${statusCode})`)
    console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`)
    console.log(`🆔 External ID: ${externalId}`)

    // Criar objeto de status processado
    const processedStatus = {
      isPaid,
      isDenied,
      isExpired,
      isCanceled,
      isRefunded,
      statusCode,
      statusName,
      amount: amount / 100,
      paymentDate: payment?.paid_at || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      externalId,
      invoiceId,
      source: "webhook",
    }

    // Salvar no cache global
    globalPaymentConfirmations.set(externalId, processedStatus)
    console.log(`💾 Status salvo no cache global: ${externalId}`)

    // Salvar webhook no banco de dados
    try {
      await supabase.from("payment_webhooks").insert({
        external_id: externalId,
        invoice_id: invoiceId,
        webhook_data: body,
        status_code: statusCode,
        status_name: statusName,
        amount: amount / 100,
        is_paid: isPaid,
        is_denied: isDenied,
        is_expired: isExpired,
        is_canceled: isCanceled,
        is_refunded: isRefunded,
        received_at: new Date().toISOString(),
      })

      console.log("✅ Webhook salvo no banco de dados")
    } catch (dbError) {
      console.log("⚠️ Erro ao salvar webhook no DB:", dbError)
    }

    // Atualizar status da fatura
    try {
      await supabase
        .from("faturas")
        .update({
          status: isPaid ? "paid" : isDenied ? "denied" : isExpired ? "expired" : "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("external_id", externalId)

      console.log("✅ Status da fatura atualizado")
    } catch (dbError) {
      console.log("⚠️ Erro ao atualizar fatura no DB:", dbError)
    }

    // Log do resultado
    if (isPaid) {
      console.log(`🎉 PAGAMENTO CONFIRMADO: ${externalId}`)
    } else if (isDenied) {
      console.log(`❌ PAGAMENTO NEGADO: ${externalId}`)
    } else if (isExpired) {
      console.log(`⏰ PAGAMENTO EXPIRADO: ${externalId}`)
    } else {
      console.log(`📋 Status atualizado: ${externalId} - ${statusName}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      status: statusName,
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no processamento do webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

// GET para consultar status via webhook (usado pelo monitor)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID obrigatório",
        },
        { status: 400 },
      )
    }

    // Verificar cache global primeiro
    const cachedStatus = globalPaymentConfirmations.get(externalId)
    if (cachedStatus) {
      console.log(`✅ Status encontrado no cache: ${externalId}`)
      return NextResponse.json({
        success: true,
        data: cachedStatus,
        source: "global_cache",
      })
    }

    // Verificar no banco de dados
    const { data: webhookData, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .order("received_at", { ascending: false })
      .limit(1)
      .single()

    if (webhookData && !error) {
      const processedStatus = {
        isPaid: webhookData.is_paid,
        isDenied: webhookData.is_denied,
        isExpired: webhookData.is_expired,
        isCanceled: webhookData.is_canceled,
        isRefunded: webhookData.is_refunded,
        statusCode: webhookData.status_code,
        statusName: webhookData.status_name,
        amount: webhookData.amount,
        paymentDate: webhookData.received_at,
        lastUpdate: webhookData.received_at,
        externalId: webhookData.external_id,
        invoiceId: webhookData.invoice_id,
        source: "database",
      }

      // Salvar no cache para próximas consultas
      globalPaymentConfirmations.set(externalId, processedStatus)

      console.log(`✅ Status encontrado no banco: ${externalId}`)
      return NextResponse.json({
        success: true,
        data: processedStatus,
        source: "database",
      })
    }

    // Não encontrado
    console.log(`⏳ Status não encontrado: ${externalId}`)
    return NextResponse.json(
      {
        success: false,
        error: "Status não encontrado",
        external_id: externalId,
      },
      { status: 404 },
    )
  } catch (error) {
    console.log("❌ Erro ao consultar webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na consulta",
      },
      { status: 500 },
    )
  }
}
