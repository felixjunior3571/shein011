import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken, clearTokenCache } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === TESTANDO AUTENTICAÇÃO SUPERPAYBR ===")

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    return NextResponse.json({
      success: true,
      message: "Autenticação SuperPayBR realizada com sucesso",
      token_preview: accessToken.slice(0, 6) + "••••",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}

export async function DELETE(request: NextRequest) {
  try {
    clearTokenCache()
    return NextResponse.json({
      success: true,
      message: "Cache de token SuperPayBR limpo",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao limpar cache",
      },
      { status: 500 },
    )
  }
}
