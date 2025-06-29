import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === AUTENTICAÇÃO SUPERPAYBR ===")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    console.log("🔍 Verificando variáveis de ambiente:", {
      apiUrl: apiUrl ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
      token: token ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
      secretKey: secretKey ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
    })

    if (!apiUrl || !token || !secretKey) {
      console.error("❌ Variáveis de ambiente SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Configuração SuperPayBR incompleta",
          missing: {
            apiUrl: !apiUrl,
            token: !token,
            secretKey: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    console.log("🌐 Enviando requisição de autenticação para:", `${apiUrl}/v4/auth`)

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

    console.log("📥 Resposta da autenticação SuperPayBR:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
      headers: Object.fromEntries(authResponse.headers.entries()),
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error("❌ Erro na autenticação SuperPayBR:", {
        status: authResponse.status,
        statusText: authResponse.statusText,
        body: errorText,
      })

      return NextResponse.json(
        {
          success: false,
          error: `Erro de autenticação SuperPayBR: ${authResponse.status} - ${authResponse.statusText}`,
          details: errorText,
        },
        { status: authResponse.status },
      )
    }

    const authData = await authResponse.json()
    console.log("📋 Dados de autenticação recebidos:", {
      hasAccessToken: !!authData.access_token,
      tokenType: authData.token_type,
      expiresIn: authData.expires_in,
    })

    if (!authData.access_token) {
      console.error("❌ Token de acesso não recebido")
      return NextResponse.json(
        {
          success: false,
          error: "Token de acesso não recebido da SuperPayBR",
        },
        { status: 500 },
      )
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida!")

    return NextResponse.json({
      success: true,
      data: {
        access_token: authData.access_token,
        token_type: authData.token_type || "Bearer",
        expires_in: authData.expires_in || 3600,
      },
      message: "Autenticação SuperPayBR realizada com sucesso",
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido na autenticação",
        stack: error instanceof Error ? error.stack : undefined,
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
    env_check: {
      apiUrl: !!process.env.SUPERPAY_API_URL,
      token: !!process.env.SUPERPAY_TOKEN,
      secretKey: !!process.env.SUPERPAY_SECRET_KEY,
    },
  })
}
