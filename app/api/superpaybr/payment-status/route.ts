import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const action = searchParams.get("action")

    console.log("🔍 Verificando status de pagamento:", { externalId, action })

    if (action === "all") {
      // Retornar todas as confirmações
      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .order("processed_at", { ascending: false })
        .limit(50)

      if (error) {
        console.error("❌ Erro ao buscar confirmações:", error)
        return NextResponse.json({ success: false, error: error.message })
      }

      return NextResponse.json({
        success: true,
        data: data || [],
      })
    }

    if (action === "events") {
      // Retornar eventos recentes
      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .order("processed_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("❌ Erro ao buscar eventos:", error)
        return NextResponse.json({ success: false, error: error.message })
      }

      const events = (data || []).map((item) => ({
        timestamp: item.processed_at,
        type: "payment_update",
        data: {
          externalId: item.external_id,
          invoiceId: item.invoice_id,
          isPaid: item.is_paid,
          isDenied: item.is_denied,
          isExpired: item.is_expired,
          isCanceled: item.is_canceled,
          statusCode: item.status_code,
          statusName: item.status_title,
          amount: item.amount,
          paymentDate: item.payment_date,
        },
      }))

      return NextResponse.json({
        success: true,
        data: events,
      })
    }

    if (!externalId) {
      return NextResponse.json({ success: false, error: "External ID required" })
    }

    // Buscar webhook específico por external_id
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ Erro ao buscar webhook:", error)
      return NextResponse.json({ success: false, error: error.message })
    }

    if (!data) {
      console.log("⏳ Nenhum webhook encontrado para:", externalId)
      return NextResponse.json({
        success: true,
        found: false,
        message: "No webhook data found yet",
      })
    }

    console.log("✅ Webhook encontrado:", {
      externalId: data.external_id,
      isPaid: data.is_paid,
      isDenied: data.is_denied,
      isExpired: data.is_expired,
      isCanceled: data.is_canceled,
    })

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        externalId: data.external_id,
        invoiceId: data.invoice_id,
        isPaid: data.is_paid,
        isDenied: data.is_denied,
        isRefunded: data.status_code === 9,
        isExpired: data.is_expired,
        isCanceled: data.is_canceled,
        statusCode: data.status_code,
        statusName: data.status_title,
        amount: (data.amount || 0) / 100, // Converter de centavos para reais
        paymentDate: data.payment_date,
        receivedAt: data.processed_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro na verificação de status:", error)
    return NextResponse.json({ success: false, error: "Internal server error" })
  }
}
