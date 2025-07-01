import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  try {
    console.log("🔍 [Database Check] Verificando dados no banco...")

    // Buscar todos os registros de webhook
    const { data, error, count } = await supabase
      .from("payment_webhooks")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("❌ [Database Check] Erro no Supabase:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    console.log(`✅ [Database Check] Encontrados ${count} registros`)

    // Buscar especificamente o external_id do teste
    const { data: specificData } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", "SHEIN_1751350461481_922teqg5i")
      .order("updated_at", { ascending: false })

    return NextResponse.json({
      success: true,
      count,
      data,
      specific_record: specificData?.[0] || null,
      message: `Encontrados ${count} registros no total`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [Database Check] Erro geral:", error)
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
    const { external_id } = await request.json()

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 [Database Check] Buscando external_id: ${external_id}`)

    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", external_id)
      .order("updated_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data,
      found: data.length > 0,
      count: data.length,
      latest: data[0] || null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
