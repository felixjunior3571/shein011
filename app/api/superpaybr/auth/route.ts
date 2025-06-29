import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("=== AUTENTICAÇÃO SUPERPAYBR ===")

    // Verificar se temos as credenciais necessárias
    if (!process.env.SUPERPAYBR_TOKEN || !process.env.SUPERPAYBR_SECRET_KEY) {
      console.log("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
        },
        { status: 500 },
      )
    }

    console.log("🔑 Usando token SuperPayBR:", process.env.SUPERPAYBR_TOKEN.substring(0, 10) + "...")

    // SuperPayBR usa autenticação direta via Bearer Token
    // Não precisa fazer chamada de autenticação, apenas retornar o token
    const authData = {
      access_token: process.env.SUPERPAYBR_TOKEN,
      token_type: "Bearer",
      expires_in: 3600, // 1 hora
      scope: "full",
      provider: "superpaybr",
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida!")

    return NextResponse.json({
      success: true,
      data: authData,
      message: "Autenticação SuperPayBR realizada com sucesso",
    })
  } catch (error) {
    console.log("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na autenticação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
