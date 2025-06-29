import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === TESTANDO CONEXÃO SUPERPAYBR ===")

    const apiUrl = process.env.SUPERPAY_API_URL
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    console.log("🔍 Verificando variáveis de ambiente...")
    console.log("API URL:", apiUrl ? "✅ Definida" : "❌ Não definida")
    console.log("Token:", token ? "✅ Definida" : "❌ Não definida")
    console.log("Secret Key:", secretKey ? "✅ Definida" : "❌ Não definida")

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

    console.log("🌐 Testando autenticação SuperPayBR...")

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
      console.error("❌ Erro na autenticação:", errorText)
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: {
            status: authResponse.status,
            statusText: authResponse.statusText,
            response: errorText,
          },
        },
        { status: 500 },
      )
    }

    const authData = await authResponse.json()
    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR testada com sucesso",
      auth: {
        token_type: authData.token_type || "Bearer",
        expires_in: authData.expires_in || 3600,
        has_access_token: !!authData.access_token,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao testar conexão SuperPayBR:", error)
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
