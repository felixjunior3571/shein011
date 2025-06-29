import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 === AUTENTICAÇÃO SUPERPAYBR (BASIC AUTH) ===")

    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    console.log("🔍 Verificando variáveis de ambiente:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
      apiUrl: apiUrl || "❌ AUSENTE",
    })

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Variáveis de ambiente SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Configuração SuperPayBR incompleta",
          missing: {
            token: !token,
            secretKey: !secretKey,
            apiUrl: !apiUrl,
          },
        },
        { status: 500 },
      )
    }

    // Criar Basic Auth base64
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    console.log("🔑 Credenciais Basic Auth:", {
      credentials: `${token.substring(0, 5)}...${secretKey.substring(0, 5)}...`,
      base64: `${base64Credentials.substring(0, 20)}...`,
    })

    // URLs de autenticação
    const authUrls = [
      `${apiUrl}/auth`,
      `${apiUrl}/token`,
      `${apiUrl}/oauth/token`,
      `${apiUrl}/authenticate`,
      `${apiUrl}/login`,
    ]

    let authSuccess = false
    let authData = null
    let lastError = null

    for (const authUrl of authUrls) {
      try {
        console.log(`🔑 Tentando autenticação Basic Auth em: ${authUrl}`)

        const authResponse = await fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${base64Credentials}`,
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
          }),
        })

        console.log(`📥 Resposta de ${authUrl}:`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok,
        })

        if (authResponse.ok) {
          authData = await authResponse.json()
          console.log("✅ Autenticação SuperPayBR bem-sucedida!")
          console.log("📋 Dados de auth:", authData)
          authSuccess = true
          break
        } else {
          const errorText = await authResponse.text()
          console.log(`❌ Falha em ${authUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro de rede em ${authUrl}:`, error)
        lastError = error
      }
    }

    if (!authSuccess) {
      console.error("❌ Todas as tentativas de autenticação falharam")
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR com Basic Auth",
          details: lastError,
          attempted_urls: authUrls,
          basic_auth_used: `Basic ${base64Credentials.substring(0, 20)}...`,
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Autenticação SuperPayBR realizada com sucesso",
      data: {
        access_token: authData.access_token || authData.token,
        token_type: authData.token_type || "Bearer",
        expires_in: authData.expires_in || 3600,
        scope: authData.scope,
      },
    })
  } catch (error) {
    console.error("❌ Erro na autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na autenticação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return GET()
}

export async function PUT() {
  return GET()
}

export async function PATCH() {
  return GET()
}
