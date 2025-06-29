import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken, isTokenCached } from "@/lib/superpaybr-auth"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === TESTANDO AUTENTICAÇÃO SUPERPAYBR ===")

    // Obter token de forma segura (não exposto)
    const accessToken = await getSuperPayAccessToken()

    // Resposta pública (SEM o token real)
    return NextResponse.json({
      success: true,
      message: "✅ Autenticação SuperPayBR realizada com sucesso!",
      data: {
        authenticated: true,
        token_type: "Bearer",
        token_preview: accessToken.slice(0, 8) + "••••••••",
        cached: isTokenCached(),
        authenticated_at: new Date().toISOString(),
        api_endpoint: "https://api.superpaybr.com/v4/invoices",
      },
      environment: {
        api_url: "https://api.superpaybr.com",
        token_configured: !!process.env.SUPERPAY_TOKEN,
        secret_configured: !!process.env.SUPERPAY_SECRET_KEY,
      },
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        authenticated: false,
      },
      { status: 401 },
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
