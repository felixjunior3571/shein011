import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status do pagamento SuperPayBR:", externalId)

    // Buscar no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .eq("provider", "superpaybr")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.log("❌ Erro ao consultar Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
        },
        { status: 500 },
      )
    }

    if (!data) {
      console.log("⚠️ Pagamento não encontrado no Supabase:", externalId)
      return NextResponse.json({
        success: false,
        message: "Pagamento não encontrado",
      })
    }

    // Mapear dados para formato esperado
    const paymentData = {
      externalId: data.external_id,
      invoiceId: data.invoice_id,
      amount: data.amount,
      status: data.status_name,
      statusTitle: data.status_title,
      statusDescription: data.status_description,
      paymentDate: data.payment_date,
      paymentGateway: data.payment_gateway,
      paymentType: data.payment_type,
      isPaid: data.is_paid,
      isDenied: data.is_denied,
      isExpired: data.is_expired,
      isCanceled: data.is_canceled,
      isRefunded: data.is_refunded,
      provider: data.provider,
      processedAt: data.processed_at,
      webhookToken: data.webhook_token,
      customerId: data.customer_id,
    }

    console.log("✅ Status encontrado:", {
      external_id: externalId,
      status: data.status_name,
      is_paid: data.is_paid,
    })

    return NextResponse.json({
      success: true,
      data: paymentData,
    })
  } catch (error) {
    console.log("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
      },
      { status: 500 },
    )
  }
}
