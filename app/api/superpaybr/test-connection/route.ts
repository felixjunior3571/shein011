import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Testando conexão SuperPayBR...")

    // Verificar variáveis de ambiente
    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!apiUrl) {
      return NextResponse.json({
        success: false,
        error: "SUPERPAY_API_URL não configurada",
        missing: ["SUPERPAY_API_URL"],
      })
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        error: "SUPERPAY_TOKEN não configurado",
        missing: ["SUPERPAY_TOKEN"],
      })
    }

    if (!secretKey) {
      return NextResponse.json({
        success: false,
        error: "SUPERPAY_SECRET_KEY não configurado",
        missing: ["SUPERPAY_SECRET_KEY"],
      })
    }

    console.log("✅ Variáveis de ambiente configuradas")

    // Testar autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })

    if (!authResponse.ok) {
      const errorData = await authResponse.json()
      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: errorData,
      })
    }

    const authData = await authResponse.json()

    if (!authData.access_token) {
      return NextResponse.json({
        success: false,
        error: "Token de acesso não obtido",
        auth_response: authData,
      })
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR testada com sucesso",
      config: {
        api_url: apiUrl,
        has_token: !!token,
        has_secret: !!secretKey,
      },
      auth: {
        success: true,
        token_type: authData.token_type,
        expires_in: authData.expires_in,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Test Connection endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
