import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO!")

    const body = await request.json()
    console.log("📦 Dados completos do webhook SuperPayBR:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    const { event, invoices } = body

    if (!invoices || !invoices.external_id) {
      console.log("❌ External ID não encontrado no webhook SuperPayBR")
      return NextResponse.json({ success: false, error: "External ID required" }, { status: 400 })
    }

    const external_id = invoices.external_id
    const invoice_id = invoices.id
    const token = invoices.token
    const status_code = invoices.status?.code
    const status_title = invoices.status?.title
    const status_description = invoices.status?.description
    const amount = invoices.prices?.total / 100 // SuperPayBR envia em centavos
    const payment_date = invoices.payment?.payDate

    console.log(`🔍 Processando webhook SuperPayBR para External ID: ${external_id}`)

    // Determinar status do pagamento baseado nos códigos SuperPayBR
    const paymentStatus = {
      isPaid: status_code === 5, // Pago
      isDenied: status_code === 12, // Pagamento Negado
      isRefunded: status_code === 9, // Estornado
      isExpired: status_code === 15, // Pagamento Vencido
      isCanceled: status_code === 6, // Cancelado
      statusCode: status_code,
      statusName: status_title,
      amount: amount,
      paymentDate: payment_date,
    }

    // Salvar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(
        {
          external_id,
          invoice_id: invoice_id?.toString(),
          token,
          status_code,
          status_name: status_title,
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
      console.error("❌ Erro ao salvar webhook SuperPayBR no Supabase:", error)
    } else {
      console.log("✅ Webhook SuperPayBR salvo no Supabase:", data)
    }

    // Log detalhado baseado no status
    if (paymentStatus.isPaid) {
      console.log(`🎉 PAGAMENTO CONFIRMADO SUPERPAYBR! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isDenied) {
      console.log(`❌ PAGAMENTO NEGADO SUPERPAYBR! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isExpired) {
      console.log(`⏰ PAGAMENTO VENCIDO SUPERPAYBR! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isCanceled) {
      console.log(`🚫 PAGAMENTO CANCELADO SUPERPAYBR! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else if (paymentStatus.isRefunded) {
      console.log(`🔄 PAGAMENTO ESTORNADO SUPERPAYBR! External ID: ${external_id}, Valor: R$ ${amount}`)
    } else {
      console.log(`📋 Status atualizado SuperPayBR: ${status_title} - External ID: ${external_id}`)
    }

    // Resposta de sucesso para o SuperPayBR
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processed successfully",
      external_id,
      status: paymentStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no processamento do webhook SuperPayBR:", error)
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
    message: "SuperPayBR Webhook Endpoint",
    status: "active",
    timestamp: new Date().toISOString(),
  })
}
