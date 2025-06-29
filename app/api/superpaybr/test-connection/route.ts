import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔍 === TESTE DE CONEXÃO SUPERPAYBR ===")

    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL

    console.log("🔍 Verificando variáveis de ambiente:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
      apiUrl: apiUrl || "❌ AUSENTE",
    })

    if (!token || !secretKey || !apiUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Variáveis de ambiente SuperPayBR não configuradas",
          missing: {
            SUPERPAY_TOKEN: !token,
            SUPERPAY_SECRET_KEY: !secretKey,
            SUPERPAY_API_URL: !apiUrl,
          },
        },
        { status: 500 },
      )
    }

    // Criar Basic Auth base64
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    console.log("🔑 Testando Basic Auth:", `Basic ${base64Credentials.substring(0, 20)}...`)

    // URLs para testar
    const testUrls = [
      `${apiUrl}/auth`,
      `${apiUrl}/token`,
      `${apiUrl}/oauth/token`,
      `${apiUrl}/authenticate`,
      `${apiUrl}/ping`,
      `${apiUrl}/health`,
    ]

    const results = []

    for (const testUrl of testUrls) {
      try {
        console.log(`🔄 Testando: ${testUrl}`)

        const response = await fetch(testUrl, {
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

        const responseText = await response.text()
        let responseData = null

        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        const result = {
          url: testUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
        }

        results.push(result)
        console.log(`📥 Resultado ${testUrl}:`, result)
      } catch (error) {
        const errorResult = {
          url: testUrl,
          error: error instanceof Error ? error.message : "Erro desconhecido",
          type: "network_error",
        }
        results.push(errorResult)
        console.log(`❌ Erro ${testUrl}:`, errorResult)
      }
    }

    // Verificar se alguma URL funcionou
    const successfulResults = results.filter((r) => "ok" in r && r.ok)
    const hasValidAuth = successfulResults.some((r) => r.data && (r.data.access_token || r.data.token))

    return NextResponse.json({
      success: hasValidAuth,
      message: hasValidAuth ? "✅ Conexão SuperPayBR estabelecida com sucesso!" : "❌ Falha na conexão SuperPayBR",
      environment: {
        token_configured: !!token,
        secret_configured: !!secretKey,
        api_url_configured: !!apiUrl,
        basic_auth_header: `Basic ${base64Credentials.substring(0, 20)}...`,
      },
      test_results: results,
      successful_urls: successfulResults.map((r) => r.url),
      working_auth: hasValidAuth,
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return GET()
}
