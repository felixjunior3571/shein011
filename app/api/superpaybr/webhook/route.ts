import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📥 Dados do webhook SuperPayBR:", JSON.stringify(webhookData, null, 2))

    // Verificar se é um evento de atualização de fatura
    if (webhookData.event?.type !== "invoice.update") {
      console.log("ℹ️ Evento ignorado:", webhookData.event?.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const invoice = webhookData.invoices || webhookData.invoice
    if (!invoice) {
      console.log("❌ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados da fatura não encontrados" }, { status: 400 })
    }

    const externalId = invoice.external_id || invoice.id
    const statusCode = invoice.status?.code
    const statusTitle = invoice.status?.title || "Status desconhecido"

    console.log("🔍 Processando webhook SuperPayBR:", {
      external_id: externalId,
      status_code: statusCode,
      status_title: statusTitle,
    })

    // Determinar status do pagamento
    let isPaid = false
    let isDenied = false
    let isExpired = false
    let isCanceled = false
    let isRefunded = false

    switch (statusCode) {
      case 5: // Pagamento Confirmado
        isPaid = true
        console.log("✅ PAGAMENTO CONFIRMADO SuperPayBR!")
        break
      case 6: // Pagamento Negado
        isDenied = true
        console.log("❌ PAGAMENTO NEGADO SuperPayBR!")
        break
      case 7: // Pagamento Vencido
        isExpired = true
        console.log("⏰ PAGAMENTO VENCIDO SuperPayBR!")
        break
      case 8: // Pagamento Cancelado
        isCanceled = true
        console.log("🚫 PAGAMENTO CANCELADO SuperPayBR!")
        break
      case 9: // Pagamento Estornado
        isRefunded = true
        console.log("↩️ PAGAMENTO ESTORNADO SuperPayBR!")
        break
      default:
        console.log(`ℹ️ Status SuperPayBR não processado: ${statusCode} - ${statusTitle}`)
    }

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
      webhookData: webhookData,
      provider: "superpaybr",
    }

    console.log("💾 Salvando no Supabase:", {
      external_id: externalId,
      status: webhookPaymentData,
    })

    // Salvar no Supabase
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
      console.log("❌ Erro ao salvar webhook SuperPayBR no Supabase:", error)
      return NextResponse.json({ success: false, error: "Erro ao salvar webhook" }, { status: 500 })
    }

    console.log("✅ Webhook SuperPayBR salvo no Supabase com sucesso!")

    // Log para debug
    if (isPaid) {
      console.log("🎉 PAGAMENTO SUPERPAYBR CONFIRMADO - Cliente será redirecionado!")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      external_id: externalId,
      status: webhookPaymentData,
    })
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido no webhook SuperPayBR",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
