import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function GET(request: NextRequest) {
  try {
    console.log("🩺 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Obter access token
    const accessToken = await getSuperPayAccessToken()

    console.log("✅ Conexão SuperPayBR testada com sucesso")
    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR está funcionando",
      token_preview: accessToken.slice(0, 6) + "••••",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao testar conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao testar conexão SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
