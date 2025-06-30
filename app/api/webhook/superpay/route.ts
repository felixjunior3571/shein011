import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { mapStatusCode } from "@/utils/status-mapper"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("🔔 Webhook SuperPay recebido:", body)

    const { external_id, status, id: invoice_id } = body

    if (!external_id || !status) {
      console.error("❌ Webhook inválido - campos obrigatórios ausentes")
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
    }

    // Mapear status code
    const statusInfo = mapStatusCode(status.code)
    console.log("📊 Status mapeado:", statusInfo)

    // Atualizar no Supabase
    const { data: fatura, error } = await supabase
      .from("faturas")
      .update({
        status: statusInfo.status,
        updated_at: new Date().toISOString(),
      })
      .eq("external_id", external_id)
      .select()
      .single()

    if (error) {
      console.error("❌ Erro ao atualizar Supabase:", error)
      return NextResponse.json({ error: "Erro interno" }, { status: 500 })
    }

    console.log("✅ Fatura atualizada:", fatura)

    // Log detalhado para debug
    if (statusInfo.isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO!", { external_id, token: fatura.token })
    } else if (statusInfo.isError) {
      console.log("⚠️ Status de erro:", { external_id, status: statusInfo.status })
    }

    return NextResponse.json({
      success: true,
      status: statusInfo.status,
      message: statusInfo.message,
    })
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
