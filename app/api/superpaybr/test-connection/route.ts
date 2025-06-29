import { type NextRequest, NextResponse } from "next/server"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

export async function GET(request: NextRequest) {
  try {
    console.log("🔗 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Testar autenticação
    const accessToken = await getSuperPayAccessToken()

    // Testar endpoint da API
    const testResponse = await fetch("https://api.superpaybr.com/v4/invoices", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    console.log("📥 Resposta teste SuperPayBR:", {
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok,
    })

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR funcionando",
      api_status: testResponse.status,
      api_ok: testResponse.ok,
      token_valid: !!accessToken,
      endpoint: "https://api.superpaybr.com/v4/invoices",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Falha na conexão SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
