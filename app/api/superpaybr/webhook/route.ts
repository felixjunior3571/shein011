import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPayBR
const STATUS_MAP: Record<number, string> = {
  1: "pending", // Aguardando Pagamento
  2: "processing", // Em Processamento
  3: "scheduled", // Pagamento Agendado
  4: "authorized", // Autorizado
  5: "paid", // ✅ PAGO
  6: "canceled", // Cancelado
  7: "refund_pending", // Aguardando Estorno
  8: "partially_refunded", // Parcialmente Estornado
  9: "refunded", // Estornado
  10: "disputed", // Contestado/Em Contestação
  12: "denied", // ❌ PAGAMENTO NEGADO
  15: "expired", // ⏰ PAGAMENTO VENCIDO
  16: "error", // Erro no Pagamento
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const webhookData = await request.json()
    console.log("📥 Dados do webhook SuperPayBR:", JSON.stringify(webhookData, null, 2))

    // Extrair dados do webhook SuperPayBR
    const { event, invoices } = webhookData

    if (!event || !invoices) {
      console.log("❌ Webhook SuperPayBR inválido - dados ausentes")
      return NextResponse.json({ error: "Invalid webhook data" }, { status: 400 })
    }

    const { id: invoiceId, external_id: externalId, status, prices, payment } = invoices

    console.log("🔍 Processando webhook SuperPayBR:", {
      event_type: event.type,
      invoice_id: invoiceId,
      external_id: externalId,
      status_code: status.code,
      status_title: status.title,
      amount: prices.total,
      payment_date: payment?.payDate,
    })

    // Mapear status SuperPayBR
    const mappedStatus = STATUS_MAP[status.code] || "unknown"
    const isPaid = status.code === 5
    const isDenied = status.code === 12
    const isExpired = status.code === 15
    const isCanceled = status.code === 6
    const isRefunded = status.code === 9

    // Preparar dados para salvar no Supabase
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      token: invoices.token || null,
      amount: prices.total,
      status_code: status.code,
      status_text: status.title,
      payment_date: payment?.payDate || null,
      is_paid: isPaid,
      is_denied: isDenied,
      is_expired: isExpired,
      is_canceled: isCanceled,
      is_refunded: isRefunded,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    console.log("💾 Salvando webhook no Supabase...")

    // UPSERT para manter atualizado
    const { data, error } = await supabase.from("payments").upsert(webhookRecord, {
      onConflict: "external_id",
    })

    if (error) {
      console.error("❌ Erro ao salvar webhook SuperPayBR no Supabase:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("✅ Webhook SuperPayBR salvo no Supabase com sucesso!")

    // Log do resultado baseado no status
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${prices.total}`)
      console.log(`📅 Data: ${payment?.payDate}`)
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    } else if (isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
    } else if (isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
    } else {
      console.log(`ℹ️ Status atualizado: ${status.title} (${mappedStatus})`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      status: mappedStatus,
      external_id: externalId,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
