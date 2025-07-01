import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const external_id = searchParams.get("external_id")
    const external_ids = searchParams.get("external_ids")

    console.log("🔍 [SuperPay Status] Consultando status:", { external_id, external_ids })

    if (!external_id && !external_ids) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id ou external_ids é obrigatório",
        },
        { status: 400 },
      )
    }

    let query = supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpaybr")
      .order("updated_at", { ascending: false })

    if (external_id) {
      // Consulta individual
      query = query.eq("external_id", external_id).limit(1)

      const { data, error } = await query.single()

      if (error && error.code !== "PGRST116") {
        console.error("❌ [SuperPay Status] Erro na consulta:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Erro na consulta",
            details: error.message,
          },
          { status: 500 },
        )
      }

      if (!data) {
        console.log("⚠️ [SuperPay Status] Nenhum status encontrado para:", external_id)
        return NextResponse.json({
          success: true,
          data: null,
          message: "Nenhum status encontrado",
        })
      }

      console.log("✅ [SuperPay Status] Status encontrado:", {
        external_id: data.external_id,
        status_code: data.status_code,
        status_title: data.status_title,
        is_paid: data.is_paid,
      })

      return NextResponse.json({
        success: true,
        data: {
          external_id: data.external_id,
          status_code: data.status_code,
          status_name: data.status_name,
          status_title: data.status_title,
          amount: data.amount,
          is_paid: data.is_paid,
          is_denied: data.is_denied,
          is_expired: data.is_expired,
          is_canceled: data.is_canceled,
          is_refunded: data.is_refunded,
          payment_date: data.payment_date,
          processed_at: data.processed_at,
          updated_at: data.updated_at,
        },
      })
    } else if (external_ids) {
      // Consulta em lote
      const idsArray = external_ids.split(",").map((id) => id.trim())
      query = query.in("external_id", idsArray)

      const { data, error } = await query

      if (error) {
        console.error("❌ [SuperPay Status] Erro na consulta em lote:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Erro na consulta em lote",
            details: error.message,
          },
          { status: 500 },
        )
      }

      console.log(`✅ [SuperPay Status] ${data?.length || 0} status encontrados para lote`)

      return NextResponse.json({
        success: true,
        data:
          data?.map((item) => ({
            external_id: item.external_id,
            status_code: item.status_code,
            status_name: item.status_name,
            status_title: item.status_title,
            amount: item.amount,
            is_paid: item.is_paid,
            is_denied: item.is_denied,
            is_expired: item.is_expired,
            is_canceled: item.is_canceled,
            is_refunded: item.is_refunded,
            payment_date: item.payment_date,
            processed_at: item.processed_at,
            updated_at: item.updated_at,
          })) || [],
        count: data?.length || 0,
      })
    }
  } catch (error) {
    console.error("❌ [SuperPay Status] Erro geral:", error)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_ids } = body

    if (!external_ids || !Array.isArray(external_ids)) {
      return NextResponse.json(
        {
          success: false,
          error: "external_ids deve ser um array",
        },
        { status: 400 },
      )
    }

    console.log("🔍 [SuperPay Status] Consultando status em lote:", external_ids)

    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpaybr")
      .in("external_id", external_ids)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("❌ [SuperPay Status] Erro na consulta POST:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na consulta",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log(`✅ [SuperPay Status] ${data?.length || 0} status encontrados via POST`)

    return NextResponse.json({
      success: true,
      data:
        data?.map((item) => ({
          external_id: item.external_id,
          status_code: item.status_code,
          status_name: item.status_name,
          status_title: item.status_title,
          amount: item.amount,
          is_paid: item.is_paid,
          is_denied: item.is_denied,
          is_expired: item.is_expired,
          is_canceled: item.is_canceled,
          is_refunded: item.is_refunded,
          payment_date: item.payment_date,
          processed_at: item.processed_at,
          updated_at: item.updated_at,
        })) || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error("❌ [SuperPay Status] Erro geral POST:", error)
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
