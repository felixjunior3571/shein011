import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("=== SIMULAÇÃO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, status_code = 5, amount = 27.97 } = body

    if (!external_id) {
      return NextResponse.json({
        success: false,
        error: "External ID é obrigatório",
      })
    }

    console.log(`🧪 Simulando pagamento SuperPayBR: ${external_id}`)
    console.log(`Status Code: ${status_code}, Amount: ${amount}`)

    // Mapear status
    const statusMap = {
      1: { name: "pending", title: "Aguardando Pagamento", critical: false },
      2: { name: "processing", title: "Em Processamento", critical: false },
      5: { name: "paid", title: "Pagamento Confirmado!", critical: true },
      6: { name: "canceled", title: "Cancelado", critical: true },
      9: { name: "refunded", title: "Estornado", critical: true },
      12: { name: "denied", title: "Pagamento Negado", critical: true },
      15: { name: "expired", title: "Pagamento Vencido", critical: true },
    }

    const statusInfo = statusMap[status_code as keyof typeof statusMap] || statusMap[5]

    // Criar webhook simulado
    const simulatedWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `sim_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: statusInfo.title,
          description: status_code === 5 ? "Obrigado pela sua Compra!" : "Simulação de pagamento",
          text: status_code === 5 ? "approved" : "simulated",
        },
        customer: 999999,
        prices: {
          total: amount,
          discount: 0,
          taxs: {
            others: 0,
          },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPay",
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: null,
          payDate: status_code === 5 ? new Date().toISOString().replace("T", " ").substring(0, 19) : null,
          details: {
            barcode: null,
            pix_code: null,
            qrcode: "00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/simulated-qr-code",
            url: null,
          },
        },
      },
    }

    // Salvar no banco de dados
    const webhookData = {
      external_id: external_id,
      invoice_id: simulatedWebhook.invoices.id,
      status_code: status_code,
      status_name: statusInfo.name,
      status_title: statusInfo.title,
      amount: amount,
      payment_date: status_code === 5 ? new Date().toISOString() : null,
      webhook_data: simulatedWebhook,
      processed_at: new Date().toISOString(),
      is_paid: status_code === 5,
      is_denied: status_code === 12,
      is_expired: status_code === 15,
      is_canceled: status_code === 6,
      is_critical: statusInfo.critical,
      gateway: "superpaybr",
      token: `SPY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }

    // Criar tabela se não existir
    try {
      await supabase.rpc("create_payment_webhooks_table_if_not_exists")
    } catch (tableError) {
      console.log("⚠️ Erro ao criar tabela (pode já existir):", tableError)
    }

    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookData, {
      onConflict: "external_id",
    })

    if (dbError) {
      console.log("❌ Erro ao salvar simulação no banco:", dbError)
      return NextResponse.json({
        success: false,
        error: "Erro ao salvar simulação no banco",
      })
    }

    console.log("✅ Simulação SuperPayBR salva no banco com sucesso")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        external_id: external_id,
        status_code: status_code,
        status_name: statusInfo.title,
        amount: amount,
        simulated: true,
        webhook_data: simulatedWebhook,
      },
    })
  } catch (error) {
    console.log("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json({
      success: false,
      error: "Erro interno do servidor",
    })
  }
}
