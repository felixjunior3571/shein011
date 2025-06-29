import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🔐 === TESTANDO AUTENTICAÇÃO SUPERPAYBR ===")

    // Credenciais SuperPayBR
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!token || !secretKey) {
      console.error("❌ Credenciais SuperPayBR não configuradas")
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais SuperPayBR não configuradas",
          missing: {
            token: !token,
            secretKey: !secretKey,
          },
        },
        { status: 500 },
      )
    }

    // Criar Basic Auth
    const credentials = `${token}:${secretKey}`
    const basicAuth = Buffer.from(credentials).toString("base64")

    console.log("🔑 Fazendo autenticação Basic Auth...")

    // URLs de autenticação para tentar
    const authUrls = [
      "https://api.superpaybr.com/auth",
      "https://api.superpaybr.com/v4/auth",
      "https://api.superpaybr.com/token",
      "https://api.superpaybr.com/oauth/token",
    ]

    let authSuccess = false
    let accessToken = null
    let authData = null
    let lastError = null

    for (const authUrl of authUrls) {
      try {
        console.log(`🔄 Tentando autenticação em: ${authUrl}`)

        const authResponse = await fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
            scope: "invoice.write customer.write webhook.write payment.read",
          }),
        })

        console.log(`📥 Resposta de ${authUrl}:`, {
          status: authResponse.status,
          statusText: authResponse.statusText,
          ok: authResponse.ok,
        })

        if (authResponse.ok) {
          authData = await authResponse.json()
          accessToken = authData.access_token
          console.log("✅ Access token obtido:", accessToken ? accessToken.slice(0, 6) + "••••" : "❌ NULO")

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
        token_preview: accessToken.slice(0, 6) + "••••",
        token_type: authData.token_type || "Bearer",
        expires_in: authData.expires_in || 3600,
        scope: authData.scope || "invoice.write customer.write webhook.write payment.read",
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
    console.error("❌ Erro ao testar autenticação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao testar autenticação SuperPayBR",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}
