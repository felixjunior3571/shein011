import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("🔍 Consultando status SuperPayBR:", { externalId, invoiceId, token })

    if (!externalId && !invoiceId && !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório ausente",
          message: "Forneça pelo menos um: externalId, invoiceId ou token",
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
    } else if (token) {
      query = query.eq("token", token)
    }

    // Ordenar por mais recente e pegar o primeiro
    query = query.order("processed_at", { ascending: false }).limit(1)

    const { data, error } = await query.single()

    if (error) {
      if (error.code === "PGRST116") {
        // Nenhum registro encontrado
        console.log("⚠️ Nenhum webhook SuperPayBR encontrado para:", { externalId, invoiceId, token })
        return NextResponse.json({
          success: true,
          found: false,
          message: "Nenhum webhook encontrado - aguardando pagamento",
          webhook: null,
          timestamp: new Date().toISOString(),
        })
      }

      console.error("❌ Erro ao consultar SuperPayBR:", error)

      // Se for erro de tabela não existir, retornar resposta amigável
      if (error.code === "42P01") {
        return NextResponse.json({
          success: true,
          found: false,
          message: "Sistema inicializando - execute o script SQL primeiro",
          webhook: null,
          timestamp: new Date().toISOString(),
        })
      }

      throw error
    }

    // Verificar se token expirou
    const now = new Date()
    const expiresAt = new Date(data.expires_at)
    const tokenExpired = now > expiresAt

    console.log("📊 Status SuperPayBR encontrado:", {
      external_id: data.external_id,
      status_code: data.status_code,
      status_title: data.status_title,
      is_paid: data.is_paid,
      is_critical: data.is_critical,
      token_expired: tokenExpired,
      processed_at: data.processed_at,
    })

    const response = {
      success: true,
      found: true,
      message: "Webhook encontrado",
      webhook: {
        external_id: data.external_id,
        invoice_id: data.invoice_id,
        status_code: data.status_code,
        status_name: data.status_name,
        status_title: data.status_title,
        amount: data.amount,
        payment_date: data.payment_date,
        processed_at: data.processed_at,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        is_critical: data.is_critical,
        token: data.token,
        expires_at: data.expires_at,
        token_expired: tokenExpired,
        gateway: data.gateway,
        webhook_data: data.webhook_data,
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro na consulta SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}
