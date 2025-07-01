import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAY")

    const body = await request.json()
    const { external_id, status_code = 5, amount = 27.97 } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("📋 Dados da simulação:", {
      external_id,
      status_code,
      amount,
    })

    // Simular webhook data completo
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: status_code === 5 ? "Pagamento Confirmado!" : `Status ${status_code}`,
          description: status_code === 5 ? "Obrigado pela sua Compra!" : `Simulação status ${status_code}`,
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
          payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126870014br.gov.bcb.pix2565pix.simulated.com.br/qr/v3/at/simulated-qr-code5204000053039865802BR5925SIMULATED_PAYMENT_TEST6006CANOAS62070503***630405EC",
            url: null,
          },
        },
      },
    }

    // Mapear status
    const STATUS_MAP = {
      1: {
        name: "pending",
        title: "Aguardando Pagamento",
        paid: false,
        denied: false,
        expired: false,
        canceled: false,
        refunded: false,
      },
      5: {
        name: "paid",
        title: "Pagamento Confirmado",
        paid: true,
        denied: false,
        expired: false,
        canceled: false,
        refunded: false,
      },
      6: {
        name: "canceled",
        title: "Cancelado",
        paid: false,
        denied: false,
        expired: false,
        canceled: true,
        refunded: false,
      },
      12: {
        name: "denied",
        title: "Pagamento Negado",
        paid: false,
        denied: true,
        expired: false,
        canceled: false,
        refunded: false,
      },
      15: {
        name: "expired",
        title: "Pagamento Vencido",
        paid: false,
        denied: false,
        expired: true,
        canceled: false,
        refunded: false,
      },
    } as const

    const statusInfo = STATUS_MAP[status_code as keyof typeof STATUS_MAP] || {
      name: "unknown",
      title: `Status ${status_code}`,
      paid: false,
      denied: false,
      expired: false,
      canceled: false,
      refunded: false,
    }

    // Preparar dados para salvar
    const webhookRecord = {
      external_id: external_id,
      invoice_id: simulatedWebhookData.invoices.id,
      token: simulatedWebhookData.invoices.token,
      status_code: status_code,
      status_title: statusInfo.title,
      status_description: simulatedWebhookData.invoices.status.description,
      status_text: simulatedWebhookData.invoices.status.text,
      amount: Number.parseFloat(amount.toString()),
      payment_date: new Date().toISOString(),
      payment_due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      payment_gateway: "SuperPay",
      qr_code: simulatedWebhookData.invoices.payment.details.qrcode,
      webhook_data: simulatedWebhookData,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.paid,
      is_denied: statusInfo.denied,
      is_expired: statusInfo.expired,
      is_canceled: statusInfo.canceled,
      is_refunded: statusInfo.refunded,
      gateway: "superpaybr",
    }

    console.log("💾 Salvando simulação SuperPay:", webhookRecord)

    // Salvar no banco
    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar simulação SuperPay:", dbError)
      throw dbError
    }

    console.log("✅ Simulação SuperPay salva com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento simulado com sucesso",
      data: {
        external_id: external_id,
        status_code: status_code,
        status_title: statusInfo.title,
        amount: amount,
        is_paid: statusInfo.paid,
        simulated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
