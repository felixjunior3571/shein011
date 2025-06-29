import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Cache em memória para evitar consultas excessivas
const statusCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
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

    console.log("🔍 Consultando status para:", externalId)

    // Verificar cache primeiro
    const cached = statusCache.get(externalId)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log("⚡ Retornando do cache")
      return NextResponse.json({
        success: true,
        cached: true,
        data: cached.data,
      })
    }

    // Consultar Supabase
    const { data, error } = await supabase.from("payments").select("*").eq("external_id", externalId).maybeSingle()

    if (error) {
      console.error("❌ Erro na consulta:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na consulta do banco",
        },
        { status: 500 },
      )
    }

    // Mapear status SuperPayBR
    const statusMapping = {
      1: "Aguardando Pagamento",
      5: "Pagamento Confirmado",
      6: "Pagamento Cancelado",
      9: "Pagamento Estornado",
      12: "Pagamento Negado",
      15: "Pagamento Vencido",
    }

    const result = {
      found: !!data,
      external_id: externalId,
      status: {
        code: data?.status_code || 1,
        name: statusMapping[data?.status_code as keyof typeof statusMapping] || "Status Desconhecido",
        isPaid: data?.is_paid || false,
        isDenied: data?.is_denied || false,
        isRefunded: data?.is_refunded || false,
        isExpired: data?.is_expired || false,
        isCanceled: data?.is_canceled || false,
      },
      payment: {
        amount: data?.amount || 0,
        payment_date: data?.payment_date,
        invoice_id: data?.invoice_id,
      },
      timestamps: {
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      },
    }

    // Salvar no cache
    statusCache.set(externalId, {
      data: result,
      timestamp: now,
    })

    console.log("✅ Status consultado:", result.status.name)

    return NextResponse.json({
      success: true,
      cached: false,
      data: result,
    })
  } catch (error) {
    console.error("❌ Erro na consulta de status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
      },
      { status: 500 },
    )
  }
}
