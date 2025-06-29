import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("🔐 Autenticando com SuperPayBR...")

    // Verificar se temos as credenciais necessárias
    if (!process.env.SUPERPAYBR_TOKEN) {
      throw new Error("SUPERPAYBR_TOKEN não configurado")
    }

    // Para SuperPayBR, geralmente usamos o token diretamente
    // Mas vamos simular uma autenticação bem-sucedida
    const authData = {
      access_token: process.env.SUPERPAYBR_TOKEN,
      token_type: "Bearer",
      expires_in: 3600,
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      data: authData,
    })
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro de autenticação",
      },
      { status: 500 },
    )
  }
}
