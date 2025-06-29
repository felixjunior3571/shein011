import { type NextRequest, NextResponse } from "next/server"

async function handleAuth() {
  try {
    console.log("🔐 === TESTANDO AUTENTICAÇÃO SUPERPAYBR ===")

    // Credenciais SuperPayBR
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    if (!token || !secretKey || !apiUrl) {
      console.error("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            SUPERPAY_TOKEN: !token,
            SUPERPAY_SECRET_KEY: !secretKey,
            SUPERPAY_API_URL: !apiUrl,
          },
        },
        { status: 500 },
      )
    }

    console.log("📋 Credenciais encontradas:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
      apiUrl: apiUrl || "❌ AUSENTE",
    })

    // Fazer autenticação Basic Auth
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    console.log("🔑 Fazendo autenticação Basic Auth...")
    console.log("🔐 Basic Auth Header:", `Basic ${base64Credentials.substring(0, 20)}...`)

    // URLs de autenticação para tentar
    const authUrls = [
      `${apiUrl}/auth`,
      `${apiUrl}/token`,
      `${apiUrl}/oauth/token`,
      `${apiUrl}/authenticate`,
      `${apiUrl}/login`,
    ]

    let authSuccess = false
    let accessToken = null
    let lastError = null
    let successUrl = ""

    for (const authUrl of authUrls) {
      try {
        console.log(`🔄 Tentando autenticação em: ${authUrl}`)

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
          const authData = await authResponse.json()
          accessToken = authData.access_token || authData.token
          console.log("✅ Access token obtido:", accessToken ? `${accessToken.substring(0, 20)}...` : "❌ NULO")

          if (accessToken) {
            authSuccess = true
            successUrl = authUrl
            console.log(`🎉 Autenticação bem-sucedida em: ${authUrl}`)
            break
          }
        } else {
          const errorText = await authResponse.text()
          console.log(`❌ Falha em ${authUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro em ${authUrl}:`, error)
        lastError = error instanceof Error ? error.message : "Erro de rede"
      }
    }

    if (authSuccess && accessToken) {
      return NextResponse.json({
        success: true,
        message: "✅ Autenticação SuperPayBR realizada com sucesso!",
        data: {
          access_token: accessToken,
          token_preview: `${accessToken.substring(0, 20)}...`,
          token_type: "Bearer",
          expires_in: 3600,
          successful_url: successUrl,
          basic_auth_header: `Basic ${base64Credentials.substring(0, 20)}...`,
        },
        environment: {
          api_url: apiUrl,
          token_configured: !!token,
          secret_configured: !!secretKey,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "❌ Falha na autenticação SuperPayBR com Basic Auth",
          details: lastError,
          attempted_urls: authUrls,
          basic_auth_header: `Basic ${base64Credentials.substring(0, 20)}...`,
          environment: {
            api_url: apiUrl,
            token_configured: !!token,
            secret_configured: !!secretKey,
          },
        },
        { status: 401 },
      )
    }
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

export async function GET(request: NextRequest) {
  return handleAuth()
}

export async function POST(request: NextRequest) {
  return handleAuth()
}
