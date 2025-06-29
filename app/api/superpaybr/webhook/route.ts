import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("📨 Webhook SuperPayBR recebido")

    const body = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(body, null, 2))

    // Verificar se é um evento de atualização de fatura
    if (body.event?.type !== "invoice.update") {
      console.log("ℹ️ Evento ignorado:", body.event?.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const invoice = body.invoices
    if (!invoice) {
      console.log("⚠️ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados da fatura não encontrados" })
    }

    const externalId = invoice.external_id || invoice.payment?.id
    const statusCode = invoice.status?.code
    const statusTitle = invoice.status?.title
    const statusName = invoice.status?.text || "unknown"

    console.log("🔍 Processando webhook SuperPayBR:", {
      external_id: externalId,
      status_code: statusCode,
      status_title: statusTitle,
    })

    // Determinar status do pagamento
    const isPaid = statusCode === 5 // SuperPayBR: 5 = Pago
    const isDenied = statusCode === 6 // SuperPayBR: 6 = Negado
    const isExpired = statusCode === 7 // SuperPayBR: 7 = Vencido
    const isCanceled = statusCode === 8 // SuperPayBR: 8 = Cancelado
    const isRefunded = statusCode === 9 // SuperPayBR: 9 = Estornado

    // Preparar dados para salvar no Supabase
    const webhookPaymentData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName: statusTitle,
      amount: invoice.valores?.liquido ? invoice.valores.liquido / 100 : 0, // Converter de centavos
      paymentDate: isPaid ? new Date().toISOString() : null,
      webhookData: body,
      provider: "superpaybr",
    }

    console.log("💾 Salvando no Supabase:", {
      external_id: externalId,
      status: webhookPaymentData,
    })

    // ⚠️ UPSERT com tratamento de erro
    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(
        {
          external_id: externalId,
          payment_data: webhookPaymentData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )
      .select()

    if (error) {
      console.error("❌ Erro ao salvar webhook SuperPayBR no Supabase:", error)
      // ⚠️ NÃO retornar erro 500 para não afetar o webhook
      console.log("⚠️ Continuando processamento apesar do erro no Supabase")
    } else {
      console.log("✅ Webhook SuperPayBR salvo no Supabase com sucesso!")
    }

    // Log específico para cada status
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${webhookPaymentData.amount}`)
      console.log(`👤 External ID: ${externalId}`)
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    } else if (isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      external_id: externalId,
      status: statusTitle,
      is_paid: isPaid,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    // ⚠️ Retornar sucesso para não afetar o webhook
    return NextResponse.json({
      success: true,
      message: "Webhook processado com erro interno",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
