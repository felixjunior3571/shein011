import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO")

    const body = await request.json()
    console.log("📥 Dados recebidos:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook
    if (!body.invoices || !body.invoices.external_id) {
      console.error("❌ Webhook inválido: external_id não encontrado")
      return NextResponse.json({ success: false, error: "Invalid webhook structure" }, { status: 400 })
    }

    const invoice = body.invoices
    const externalId = invoice.external_id
    const statusCode = invoice.status?.code || 0
    const statusTitle = invoice.status?.title || "Status desconhecido"
    const statusDescription = invoice.status?.description || ""
    const statusText = invoice.status?.text || ""

    console.log("📋 Processando webhook:", {
      external_id: externalId,
      status_code: statusCode,
      status_title: statusTitle,
    })

    // Mapear status para flags booleanas
    const statusFlags = {
      is_paid: statusCode === 5,
      is_denied: statusCode === 12,
      is_expired: statusCode === 15,
      is_canceled: statusCode === 6,
      is_refunded: statusCode === 9,
    }

    // Preparar dados para salvar
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoice.id?.toString() || null,
      token: invoice.token || null,
      status_code: statusCode,
      status_name: getStatusName(statusCode),
      status_title: statusTitle,
      status_description: statusDescription,
      status_text: statusText,
      amount: invoice.prices?.total ? Number.parseFloat(invoice.prices.total.toString()) : null,
      payment_date: invoice.payment?.payDate || invoice.payment?.date || null,
      payment_due: invoice.payment?.due || null,
      payment_gateway: invoice.payment?.gateway || "SuperPayBR",
      qr_code: invoice.payment?.details?.qrcode || null,
      pix_code: invoice.payment?.details?.pix_code || null,
      barcode: invoice.payment?.details?.barcode || null,
      webhook_data: body,
      processed_at: new Date().toISOString(),
      gateway: "superpaybr",
      ...statusFlags,
    }

    console.log("💾 Salvando no banco:", webhookRecord)

    // Salvar no Supabase
    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar no banco:", dbError)
      throw dbError
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    // Log especial para pagamentos confirmados
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO! External ID:", externalId)
      console.log("💰 Valor:", webhookRecord.amount)
      console.log("🔄 Sistema deve redirecionar para /upp/001")
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      external_id: externalId,
      status_code: statusCode,
      is_paid: statusFlags.is_paid,
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
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

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  })
}
