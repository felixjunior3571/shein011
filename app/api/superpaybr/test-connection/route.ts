import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔧 Testando conexão SuperPayBR...")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!apiUrl || !token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Variáveis de ambiente SuperPayBR não configuradas",
          missing: {
            apiUrl: !apiUrl,
            token: !token,
            secretKey: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    // Testar autenticação
    const authResponse = await fetch(`${apiUrl}/v4/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token: token,
        secret_key: secretKey,
      }),
    })

    if (!authResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação SuperPayBR: ${authResponse.status}`,
          status: authResponse.status,
        },
        { status: authResponse.status },
      )
    }

    const authData = await authResponse.json()

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR bem-sucedida",
      data: {
        api_url: apiUrl,
        authenticated: true,
        access_token_received: !!authData.access_token,
        expires_in: authData.expires_in,
      },
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
