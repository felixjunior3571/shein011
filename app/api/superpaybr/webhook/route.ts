import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    const externalId = body.external_id || body.payment?.external_id || body.data?.external_id
    const status = body.status || body.payment?.status || body.data?.status
    const amount = body.amount || body.payment?.amount || body.data?.amount || 0
    const paymentId = body.id || body.payment?.id || body.data?.id
    const statusCode = status?.code || body.status_code || 0
    const statusName = status?.name || status?.title || body.status_name || "unknown"

    console.log("🔍 Dados extraídos:", {
      externalId,
      paymentId,
      statusCode,
      statusName,
      amount,
    })

    if (!externalId) {
      console.error("❌ External ID não encontrado no webhook")
      return NextResponse.json(
        {
          success: false,
          error: "External ID não encontrado",
        },
        { status: 400 },
      )
    }

    // Determinar status do pagamento
    let isPaid = false
    let isDenied = false
    let isRefunded = false
    let isExpired = false
    let isCanceled = false

    // SuperPayBR status codes
    switch (statusCode) {
      case 5: // Pago
        isPaid = true
        break
      case 3: // Negado
        isDenied = true
        break
      case 6: // Estornado
        isRefunded = true
        break
      case 7: // Vencido
        isExpired = true
        break
      case 8: // Cancelado
        isCanceled = true
        break
      default:
        console.log(`⚠️ Status desconhecido: ${statusCode}`)
    }

    // Salvar no Supabase
    const { data: savedPayment, error: saveError } = await supabase
      .from("superpaybr_payments")
      .upsert(
        {
          external_id: externalId,
          payment_id: paymentId,
          status_code: statusCode,
          status_name: statusName,
          amount: amount,
          is_paid: isPaid,
          is_denied: isDenied,
          is_refunded: isRefunded,
          is_expired: isExpired,
          is_canceled: isCanceled,
          webhook_data: body,
          payment_date: isPaid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )
      .select()

    if (saveError) {
      console.error("❌ Erro ao salvar no Supabase:", saveError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar webhook",
          details: saveError.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Webhook SuperPayBR processado:", savedPayment?.[0])

    // Broadcast update via Supabase Realtime
    const { error: broadcastError } = await supabase.from("payment_updates").insert({
      external_id: externalId,
      status_code: statusCode,
      status_name: statusName,
      is_paid: isPaid,
      is_denied: isDenied,
      is_refunded: isRefunded,
      is_expired: isExpired,
      is_canceled: isCanceled,
      amount: amount,
      payment_date: isPaid ? new Date().toISOString() : null,
    })

    if (broadcastError) {
      console.error("❌ Erro no broadcast:", broadcastError)
    } else {
      console.log("📡 Broadcast enviado com sucesso")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      data: {
        external_id: externalId,
        status: {
          code: statusCode,
          name: statusName,
          is_paid: isPaid,
          is_denied: isDenied,
          is_refunded: isRefunded,
          is_expired: isExpired,
          is_canceled: isCanceled,
        },
        amount: amount,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no webhook SuperPayBR",
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
      error: "Método GET não suportado para webhook. Use POST.",
    },
    { status: 405 },
  )
}
