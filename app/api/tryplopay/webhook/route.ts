import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK TRYPLOPAY RECEBIDO!")

    const body = await request.json()
    console.log("📦 Dados completos do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook baseado na estrutura do TryploPay
    const {
      external_id,
      invoice_id,
      token,
      status_code,
      status_name,
      status_description,
      amount,
      payment_date,
      is_paid,
      is_denied,
      is_refunded,
      is_expired,
      is_canceled,
    } = body

    if (!external_id) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID required" }, { status: 400 })
    }

    console.log(`🔍 Processando webhook para External ID: ${external_id}`)

    // Determinar status do pagamento
    const paymentStatus = {
      isPaid: is_paid || status_code === 2 || status_name === "paid",
      isDenied: is_denied || status_code === 3 || status_name === "denied",
      isRefunded: is_refunded || status_code === 4 || status_name === "refunded",
      isExpired: is_expired || status_code === 5 || status_name === "expired",
      isCanceled: is_canceled || status_code === 6 || status_name === "canceled",
      statusCode: status_code,
      statusName: status_name,
      amount: amount,
      paymentDate: payment_date,
    }

    // Salvar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(
        {
          external_id,
          invoice_id,
          token,
          status_code,
          status_name,
          status_description,
          amount,
          payment_date,
          is_paid: paymentStatus.isPaid,
          is_denied: paymentStatus.isDenied,
          is_refunded: paymentStatus.isRefunded,
          is_expired: paymentStatus.isExpired,
          is_canceled: paymentStatus.isCanceled,
          webhook_data: body,
          received_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )
      .select()

    if (error) {
      console.error("❌ Erro ao salvar webhook no Supabase:", error)
    } else {
      console.log("✅ Webhook salvo no Supabase:", data)
    }

    // Log detalhado baseado no status
    if (paymentStatus.isPaid) {
      console.log(`🎉 PAGAMENTO CONFIRMADO! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isDenied) {
      console.log(`❌ PAGAMENTO NEGADO! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isExpired) {
      console.log(`⏰ PAGAMENTO VENCIDO! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isCanceled) {
      console.log(`🚫 PAGAMENTO CANCELADO! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isRefunded) {
      console.log(`🔄 PAGAMENTO ESTORNADO! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else {
      console.log(`📋 Status atualizado: ${status_name} - External ID: ${external_id}`)
    }

    // Resposta de sucesso para o TryploPay
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      external_id,
      status: paymentStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no processamento do webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Método GET para verificar se o endpoint está funcionando
export async function GET() {
  return NextResponse.json({
    message: "TryploPay Webhook Endpoint",
    status: "active",
    timestamp: new Date().toISOString(),
  })
}
