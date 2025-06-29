import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔐 === AUTENTICAÇÃO SUPERPAYBR ===")

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

    // Tentar múltiplas URLs de autenticação
    const authUrls = [`${apiUrl}/v4/auth`, `${apiUrl}/auth`, `${apiUrl}/v4/token`, `${apiUrl}/token`]

    let authSuccess = false
    let authData = null
    let lastError = null

    for (const authUrl of authUrls) {
      try {
        console.log(`🔑 Tentando autenticação em: ${authUrl}`)

        const authResponse = await fetch(authUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-Key": secretKey,
          },
          body: JSON.stringify({
            grant_type: "client_credentials",
            client_id: token,
            client_secret: secretKey,
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
          error: "Falha na autenticação SuperPayBR em todas as URLs",
          details: lastError,
          attempted_urls: authUrls,
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Autenticação SuperPayBR realizada com sucesso",
      data: {
        access_token: authData.access_token || token, // Fallback para o próprio token
        token_type: authData.token_type || "Bearer",
        expires_in: authData.expires_in || 3600,
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
