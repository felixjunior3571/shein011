import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 Autenticando SuperPayBR...")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!apiUrl || !token || !secretKey) {
      console.error("❌ Variáveis de ambiente SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Configuração SuperPayBR incompleta",
        },
        { status: 500 },
      )
    }

    console.log("🌐 Enviando requisição de autenticação...")

    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Card-System/1.0",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error("❌ Erro na autenticação SuperPayBR:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação: ${authResponse.status}`,
        },
        { status: authResponse.status },
      )
    }

    const authData = await authResponse.json()
    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      access_token: authData.access_token,
      token_type: authData.token_type || "Bearer",
      expires_in: authData.expires_in || 3600,
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
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
    message: "SuperPayBR Auth endpoint ativo",
    timestamp: new Date().toISOString(),
  })
}
