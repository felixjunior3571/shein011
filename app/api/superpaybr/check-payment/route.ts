import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "External ID is required" }, { status: 400 })
    }

    console.log("🔍 [SuperPayBR Check] Consultando pagamento para:", externalId)

    // Buscar no Supabase (dados do webhook)
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .eq("gateway", "SuperPayBR")
        .order("received_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ [SuperPayBR Check] Erro ao consultar Supabase:", error)
        throw error
      }

      if (data) {
        console.log("✅ [SuperPayBR Check] Status encontrado no webhook:", {
          external_id: data.external_id,
          status: data.status_name,
          is_paid: data.is_paid,
          amount: data.amount,
        })

        const paymentStatus = {
          isPaid: data.is_paid,
          isDenied: data.is_denied,
          isRefunded: data.is_refunded,
          isExpired: data.is_expired,
          isCanceled: data.is_canceled,
          statusCode: data.status_code,
          statusName: data.status_name,
          statusTitle: data.status_title,
          amount: data.amount,
          paymentDate: data.payment_date,
          gateway: data.gateway,
        }

        return NextResponse.json({
          success: true,
          found: true,
          data: paymentStatus,
          source: "webhook",
          receivedAt: data.received_at,
        })
      } else {
        console.log("⏳ [SuperPayBR Check] Nenhum webhook recebido ainda para:", externalId)

        return NextResponse.json({
          success: true,
          found: false,
          message: "No webhook received yet",
          externalId,
        })
      }
    } catch (dbError) {
      console.error("❌ [SuperPayBR Check] Erro na consulta ao banco:", dbError)

      return NextResponse.json({
        success: false,
        error: "Database error",
        message: "Unable to check payment status",
      })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Check] Erro geral na consulta:", error)

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
