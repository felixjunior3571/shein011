import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { external_id } = await request.json()

    if (!external_id) {
      return NextResponse.json({ success: false, message: "External ID é obrigatório" }, { status: 400 })
    }

    console.log("🔍 Verificando pagamento para external_id:", external_id)

    // Buscar dados na tabela payment_webhooks
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", external_id)
      .order("processed_at", { ascending: false })

    if (error) {
      console.error("❌ Erro ao consultar Supabase:", error)
      return NextResponse.json(
        { success: false, message: "Erro ao consultar banco de dados", error: error.message },
        { status: 500 },
      )
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Nenhum registro encontrado para:", external_id)
      return NextResponse.json({ success: false, message: "Nenhum pagamento encontrado", count: 0 }, { status: 404 })
    }

    console.log(`✅ Encontrados ${data.length} registros para:`, external_id)
    console.log("📄 Dados:", data[0])

    return NextResponse.json({
      success: true,
      message: `${data.length} registro(s) encontrado(s)`,
      count: data.length,
      data: data,
      latest: data[0],
    })
  } catch (error) {
    console.error("❌ Erro interno:", error)
    return NextResponse.json({ success: false, message: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de verificação de pagamento ativo",
    version: "1.0.0",
  })
}
