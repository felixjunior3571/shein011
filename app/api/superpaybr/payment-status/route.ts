import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente Supabase com service key para operações de servidor
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const external_id = searchParams.get("external_id")

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Payment Status] Consultando status para: ${external_id}`)

    // Buscar status no Supabase
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", external_id)
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("❌ [Payment Status] Erro no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na consulta ao banco de dados",
          details: error.message,
        },
        { status: 500 },
      )
    }

    if (!data) {
      console.log(`📋 [Payment Status] Nenhum status encontrado para: ${external_id}`)
      return NextResponse.json({
        success: true,
        found: false,
        message: "Nenhum status encontrado para este external_id",
        data: null,
      })
    }

    console.log(`✅ [Payment Status] Status encontrado:`, {
      external_id: data.external_id,
      status_code: data.status_code,
      status_title: data.status_title,
      is_paid: data.is_paid,
    })

    return NextResponse.json({
      success: true,
      found: true,
      data: {
        external_id: data.external_id,
        invoice_id: data.invoice_id,
        status_code: data.status_code,
        status_name: data.status_name,
        status_title: data.status_title,
        amount: data.amount,
        payment_date: data.payment_date,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        is_refunded: data.is_refunded,
        processed_at: data.processed_at,
        created_at: data.created_at,
      },
    })
  } catch (error) {
    console.error("❌ [Payment Status] Erro geral:", error)
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

    console.log(`🔍 [Payment Status Batch] Consultando status para ${external_ids.length} external_ids`)

    // Buscar status em lote
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .in("external_id", external_ids)
      .order("processed_at", { ascending: false })

    if (error) {
      console.error("❌ [Payment Status Batch] Erro no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na consulta ao banco de dados",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Agrupar por external_id (pegar o mais recente de cada)
    const statusMap = new Map()
    data.forEach((item) => {
      if (
        !statusMap.has(item.external_id) ||
        new Date(item.processed_at) > new Date(statusMap.get(item.external_id).processed_at)
      ) {
        statusMap.set(item.external_id, item)
      }
    })

    const results = external_ids.map((external_id) => {
      const status = statusMap.get(external_id)
      return {
        external_id,
        found: !!status,
        data: status
          ? {
              external_id: status.external_id,
              invoice_id: status.invoice_id,
              status_code: status.status_code,
              status_name: status.status_name,
              status_title: status.status_title,
              amount: status.amount,
              payment_date: status.payment_date,
              is_paid: status.is_paid,
              is_denied: status.is_denied,
              is_expired: status.is_expired,
              is_canceled: status.is_canceled,
              is_refunded: status.is_refunded,
              processed_at: status.processed_at,
            }
          : null,
      }
    })

    console.log(`✅ [Payment Status Batch] Retornando ${results.length} resultados`)

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    })
  } catch (error) {
    console.error("❌ [Payment Status Batch] Erro geral:", error)
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
