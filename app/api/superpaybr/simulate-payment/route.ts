import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 SIMULAÇÃO DE PAGAMENTO SUPERPAYBR")

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

    console.log("📋 Simulando pagamento:", {
      external_id,
      status_code,
      amount,
    })

    // Simular webhook data conforme estrutura real da SuperPayBR
    const simulatedWebhookData = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `SIM_${Date.now()}`,
        external_id: external_id,
        token: `sim-token-${Date.now()}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: status_code,
          title: getStatusTitle(status_code),
          description: getStatusDescription(status_code),
          text: getStatusText(status_code),
        },
        customer: 999999,
        prices: {
          total: amount,
          discount: 0,
          taxs: { others: 0 },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPayBR",
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: null,
          payDate: status_code === 5 ? new Date().toISOString().replace("T", " ").substring(0, 19) : null,
          details: {
            barcode: null,
            pix_code: `00020101021226840014br.gov.bcb.pix2536simulated.superpaybr.com/qr/v2/SIM${Date.now()}`,
            qrcode: `https://quickchart.io/qr?text=simulated_${external_id}`,
            url: null,
          },
        },
      },
    }

    // Mapear status para flags booleanas
    const statusFlags = {
      is_paid: status_code === 5,
      is_denied: status_code === 12,
      is_expired: status_code === 15,
      is_canceled: status_code === 6,
      is_refunded: status_code === 9,
    }

    // Preparar dados para salvar no banco
    const webhookRecord = {
      external_id: external_id,
      invoice_id: simulatedWebhookData.invoices.id,
      token: simulatedWebhookData.invoices.token,
      status_code: status_code,
      status_name: getStatusName(status_code),
      status_title: simulatedWebhookData.invoices.status.title,
      status_description: simulatedWebhookData.invoices.status.description,
      status_text: simulatedWebhookData.invoices.status.text,
      amount: Number.parseFloat(amount.toString()),
      payment_date: simulatedWebhookData.invoices.payment.payDate,
      payment_due: simulatedWebhookData.invoices.payment.due,
      payment_gateway: "SuperPayBR",
      qr_code: simulatedWebhookData.invoices.payment.details.qrcode,
      pix_code: simulatedWebhookData.invoices.payment.details.pix_code,
      barcode: simulatedWebhookData.invoices.payment.details.barcode,
      webhook_data: simulatedWebhookData,
      processed_at: new Date().toISOString(),
      gateway: "superpaybr",
      ...statusFlags,
    }

    console.log("💾 Salvando simulação no banco:", webhookRecord)

    // Salvar diretamente no banco (não usar API SuperPayBR para simulação)
    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar simulação:", dbError)
      throw dbError
    }

    console.log("✅ Simulação SuperPayBR salva com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPayBR simulado com sucesso",
      data: {
        external_id: external_id,
        status_code: status_code,
        status_title: simulatedWebhookData.invoices.status.title,
        is_paid: statusFlags.is_paid,
        amount: amount,
        simulated_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

function getStatusName(statusCode: number): string {
  const statusMap: Record<number, string> = {
    1: "pending",
    5: "paid",
    6: "canceled",
    9: "refunded",
    12: "denied",
    15: "expired",
  }
  return statusMap[statusCode] || "unknown"
}

function getStatusTitle(statusCode: number): string {
  const titleMap: Record<number, string> = {
    1: "Aguardando Pagamento",
    5: "Pagamento Confirmado!",
    6: "Pagamento Cancelado",
    9: "Pagamento Estornado",
    12: "Pagamento Negado",
    15: "Pagamento Vencido",
  }
  return titleMap[statusCode] || "Status Desconhecido"
}

function getStatusDescription(statusCode: number): string {
  const descMap: Record<number, string> = {
    1: "Aguardando confirmação do pagamento",
    5: "Pagamento foi confirmado com sucesso",
    6: "Pagamento foi cancelado pelo usuário",
    9: "Pagamento foi estornado",
    12: "Pagamento foi negado pelo banco",
    15: "Pagamento venceu sem ser pago",
  }
  return descMap[statusCode] || "Descrição não disponível"
}

function getStatusText(statusCode: number): string {
  const textMap: Record<number, string> = {
    1: "pending",
    5: "approved",
    6: "canceled",
    9: "refunded",
    12: "denied",
    15: "expired",
  }
  return textMap[statusCode] || "unknown"
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de simulação SuperPayBR ativo",
    usage: "POST com { external_id, status_code?, amount? }",
    status_codes: {
      1: "Aguardando Pagamento",
      5: "Pagamento Confirmado (Pago)",
      6: "Cancelado",
      9: "Estornado",
      12: "Pagamento Negado",
      15: "Pagamento Vencido",
    },
  })
}
