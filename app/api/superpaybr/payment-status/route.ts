import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")

    console.log("🔍 Consultando status SuperPay:", { externalId, invoiceId })

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório ausente",
          message: "Forneça externalId ou invoiceId",
        },
        { status: 400 },
      )
    }

    // Construir query baseada nos parâmetros fornecidos
    let query = supabase.from("payment_webhooks").select("*").eq("gateway", "superpaybr")

    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    }

    // Ordenar por mais recente e pegar o primeiro
    query = query.order("processed_at", { ascending: false }).limit(1)

    const { data, error } = await query.single()

    if (error) {
      if (error.code === "PGRST116") {
        // Nenhum registro encontrado
        console.log("⚠️ Nenhum webhook SuperPay encontrado para:", { externalId, invoiceId })
        return NextResponse.json({
          success: true,
          found: false,
          message: "Nenhum webhook encontrado - aguardando pagamento",
          data: null,
          timestamp: new Date().toISOString(),
        })
      }

      console.error("❌ Erro ao consultar SuperPay:", error)

      // Se for erro de tabela não existir, retornar resposta amigável
      if (error.code === "42P01") {
        return NextResponse.json({
          success: false,
          found: false,
          error: "Tabela não encontrada",
          message: "Execute o script SQL: scripts/create-superpay-webhooks-table.sql",
          timestamp: new Date().toISOString(),
        })
      }

      throw error
    }

    console.log("📊 Status SuperPay encontrado:", {
      external_id: data.external_id,
      invoice_id: data.invoice_id,
      status_code: data.status_code,
      status_title: data.status_title,
      is_paid: data.is_paid,
      processed_at: data.processed_at,
    })

    const response = {
      success: true,
      found: true,
      message: "Status encontrado",
      data: {
        external_id: data.external_id,
        invoice_id: data.invoice_id,
        token: data.token,
        status_code: data.status_code,
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
        webhook_data: data.webhook_data,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro na consulta SuperPay:", error)

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
