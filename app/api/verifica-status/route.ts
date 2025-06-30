import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { isTokenExpired } from "@/utils/token-generator"
import { getStatusMessage } from "@/utils/status-mapper"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token obrigatório" }, { status: 400 })
    }

    console.log("🔍 Verificando status para token:", token.substring(0, 8) + "...")

    // Buscar fatura no Supabase
    const { data: fatura, error } = await supabase.from("faturas").select("*").eq("token", token).single()

    if (error || !fatura) {
      console.error("❌ Fatura não encontrada:", error)
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 404 })
    }

    // Verificar se token expirou
    if (isTokenExpired(fatura.expires_at)) {
      console.log("⏰ Token expirado:", token.substring(0, 8) + "...")
      return NextResponse.json({ error: "Token expirado" }, { status: 410 })
    }

    const isPaid = fatura.status === "pago"
    const statusMessage = getStatusMessage(fatura.status)

    console.log("📊 Status atual:", {
      status: fatura.status,
      isPaid,
      external_id: fatura.external_id,
    })

    return NextResponse.json({
      paid: isPaid,
      status: fatura.status,
      message: statusMessage,
      external_id: fatura.external_id,
      expires_at: fatura.expires_at,
      updated_at: fatura.updated_at,
    })
  } catch (error: any) {
    console.error("❌ Erro na verificação de status:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
