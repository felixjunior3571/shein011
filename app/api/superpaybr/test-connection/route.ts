import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 === TESTANDO CONEXÃO SUPERPAYBR ===")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    console.log("🔍 Verificando variáveis de ambiente:")
    console.log("API URL:", apiUrl ? "✅ DEFINIDA" : "❌ AUSENTE")
    console.log("TOKEN:", token ? "✅ DEFINIDA" : "❌ AUSENTE")
    console.log("SECRET KEY:", secretKey ? "✅ DEFINIDA" : "❌ AUSENTE")

    if (!apiUrl || !token || !secretKey) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente SuperPayBR não configuradas",
        missing: {
          api_url: !apiUrl,
          token: !token,
          secret_key: !secretKey,
        },
      })
    }

    // Testar autenticação
    console.log("🔐 Testando autenticação...")
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

    console.log("📥 Resposta da autenticação:", {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok,
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.log("❌ Erro na autenticação:", errorText)
      return NextResponse.json({
        success: false,
        error: "Falha na autenticação SuperPayBR",
        details: {
          status: authResponse.status,
          statusText: authResponse.statusText,
          error: errorText,
        },
      })
    }

    const authData = await authResponse.json()
    console.log("✅ Autenticação bem-sucedida")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR funcionando corretamente",
      auth: {
        has_access_token: !!authData.access_token,
        token_type: authData.token_type || "Bearer",
        expires_in: authData.expires_in || 3600,
      },
      environment: {
        api_url: apiUrl,
        has_token: !!token,
        has_secret_key: !!secretKey,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Use GET para testar a conexão SuperPayBR",
    timestamp: new Date().toISOString(),
  })
}
