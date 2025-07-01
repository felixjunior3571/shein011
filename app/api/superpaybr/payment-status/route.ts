import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const invoiceId = searchParams.get("invoice_id")

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório ausente",
          message: "Forneça external_id ou invoice_id",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status SuperPay no banco:", { externalId, invoiceId })

    // Construir query baseada nos parâmetros fornecidos
    let query = supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpaybr")
      .order("processed_at", { ascending: false })

    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    }

    const { data, error } = await query.limit(1).single()

    if (error) {
      console.log("⚠️ Erro ao consultar SuperPay:", error)

      if (error.code === "PGRST116") {
        // Nenhum registro encontrado - retornar status padrão
        console.log("📭 Nenhum webhook SuperPay encontrado - aguardando pagamento")
        return NextResponse.json({
          success: true,
          found: false,
          message: "Pagamento não encontrado - aguardando webhook",
          data: {
            external_id: externalId,
            invoice_id: invoiceId,
            status_code: 1,
            status_title: "Aguardando Pagamento",
            status_name: "pending",
            is_paid: false,
            is_denied: false,
            is_expired: false,
            is_canceled: false,
            is_refunded: false,
            last_check: new Date().toISOString(),
          },
        })
      }

      // Se for erro de tabela não existir
      if (error.code === "42P01") {
        return NextResponse.json({
          success: false,
          found: false,
          error: "Tabela não encontrada",
          message: "Execute o script SQL: scripts/create-payment-webhooks-table.sql",
          timestamp: new Date().toISOString(),
        })
      }

      throw error
    }

    console.log("✅ Status SuperPay encontrado no banco:", {
      external_id: data.external_id,
      status_code: data.status_code,
      status_title: data.status_title,
      is_paid: data.is_paid,
      processed_at: data.processed_at,
    })

    return NextResponse.json({
      success: true,
      found: true,
      message: "Status encontrado no banco",
      data: {
        external_id: data.external_id,
        invoice_id: data.invoice_id,
        token: data.token,
        status_code: data.status_code,
        status_name: data.status_name,
        status_title: data.status_title,
        status_description: data.status_description,
        status_text: data.status_text,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_due: data.payment_due,
        payment_gateway: data.payment_gateway,
        qr_code: data.qr_code,
        processed_at: data.processed_at,
        updated_at: data.updated_at,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        is_refunded: data.is_refunded,
        gateway: data.gateway,
        last_check: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro interno ao consultar status SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
