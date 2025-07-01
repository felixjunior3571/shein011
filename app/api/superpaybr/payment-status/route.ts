import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

// Rate limiting por external_id
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 30 // 30 requests por minuto por external_id

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "external_id is required" }, { status: 400 })
    }

    // Rate limiting
    const now = Date.now()
    const rateLimitKey = externalId
    const rateLimitData = rateLimitMap.get(rateLimitKey)

    if (rateLimitData) {
      if (now - rateLimitData.lastRequest < RATE_LIMIT_WINDOW) {
        if (rateLimitData.count >= MAX_REQUESTS_PER_WINDOW) {
          console.log(`⚠️ Rate limit atingido para ${externalId}`)
          return NextResponse.json(
            { success: false, error: "Rate limit exceeded", retry_after: RATE_LIMIT_WINDOW },
            { status: 429 },
          )
        }
        rateLimitData.count++
      } else {
        rateLimitData.count = 1
        rateLimitData.lastRequest = now
      }
    } else {
      rateLimitMap.set(rateLimitKey, { count: 1, lastRequest: now })
    }

    console.log(`🔍 Consultando status para: ${externalId}`)

    // Consultar APENAS o banco (não a API SuperPayBR para evitar rate limit)
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .eq("gateway", "superpaybr")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error("❌ Erro ao consultar banco:", error)
      throw error
    }

    if (!data) {
      console.log(`📋 Nenhum webhook encontrado para: ${externalId}`)
      return NextResponse.json({
        success: true,
        status: "not_found",
        message: "Payment not found in database",
        external_id: externalId,
        is_paid: false,
        is_final: false,
      })
    }

    console.log(`📊 Status encontrado:`, {
      external_id: externalId,
      status_code: data.status_code,
      is_paid: data.is_paid,
      is_final: data.is_paid || data.is_denied || data.is_expired || data.is_canceled || data.is_refunded,
    })

    return NextResponse.json({
      success: true,
      status: data.status_name || "unknown",
      external_id: externalId,
      invoice_id: data.invoice_id,
      status_code: data.status_code,
      status_title: data.status_title,
      amount: data.amount,
      payment_date: data.payment_date,
      is_paid: data.is_paid,
      is_denied: data.is_denied,
      is_expired: data.is_expired,
      is_canceled: data.is_canceled,
      is_refunded: data.is_refunded,
      is_final: data.is_paid || data.is_denied || data.is_expired || data.is_canceled || data.is_refunded,
      processed_at: data.processed_at,
      qr_code: data.qr_code,
      pix_code: data.pix_code,
    })
  } catch (error) {
    console.error("❌ Erro na consulta de status:", error)

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
