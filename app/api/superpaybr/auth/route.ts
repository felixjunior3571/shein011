import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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
            token: !token,
            secretKey: !secretKey,
            apiUrl: !apiUrl,
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

    // URLs de autenticação para tentar
    const authUrls = [`${apiUrl}/auth`, `${apiUrl}/token`, `${apiUrl}/oauth/token`, `${apiUrl}/authenticate`]

    let authSuccess = false
    let accessToken = null
    let lastError = null

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
            break
          }
        } else {
          const errorText = await authResponse.text()
          console.log(`❌ Falha em ${authUrl}:`, errorText)
          lastError = errorText
        }
      } catch (error) {
        console.log(`❌ Erro em ${authUrl}:`, error)
        lastError = error
      }
    }

    if (authSuccess && accessToken) {
      return NextResponse.json({
        success: true,
        message: "Autenticação SuperPayBR realizada com sucesso",
        access_token: accessToken,
        token_preview: `${accessToken.substring(0, 20)}...`,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: lastError,
          attempted_urls: authUrls,
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
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para testar autenticação.",
    },
    { status: 405 },
  )
}
