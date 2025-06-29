import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 === TESTANDO CONEXÃO SUPERPAYBR ===")

    // Verificar variáveis de ambiente
    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL
    const webhookUrl = process.env.SUPERPAY_WEBHOOK_URL

    console.log("📋 Verificando variáveis de ambiente:", {
      SUPERPAY_TOKEN: token ? "✅ CONFIGURADO" : "❌ AUSENTE",
      SUPERPAY_SECRET_KEY: secretKey ? "✅ CONFIGURADO" : "❌ AUSENTE",
      SUPERPAY_API_URL: apiUrl ? "✅ CONFIGURADO" : "❌ AUSENTE",
      SUPERPAY_WEBHOOK_URL: webhookUrl ? "✅ CONFIGURADO" : "❌ AUSENTE",
    })

    if (!token || !secretKey || !apiUrl) {
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

    // Testar autenticação
    console.log("🔐 Testando autenticação Basic Auth...")

    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    // URLs para testar
    const testUrls = [`${apiUrl}/auth`, `${apiUrl}/token`, `${apiUrl}/health`, `${apiUrl}/status`]

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

        const result = {
          url: testUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
        }

        if (response.ok) {
          try {
            const data = await response.json()
            result.data = data
            console.log(`✅ Sucesso em ${testUrl}:`, data)
          } catch {
            result.data = await response.text()
          }
        } else {
          try {
            result.error = await response.text()
            console.log(`❌ Erro em ${testUrl}:`, result.error)
          } catch {
            result.error = "Erro ao ler resposta"
          }
        }

        results.push(result)
      } catch (error) {
        console.log(`❌ Erro de rede em ${testUrl}:`, error)
        results.push({
          url: testUrl,
          error: error instanceof Error ? error.message : "Erro de rede",
          status: 0,
        })
      }
    }

    // Verificar se pelo menos uma URL funcionou
    const hasSuccess = results.some((r) => r.ok)

    return NextResponse.json({
      success: hasSuccess,
      message: hasSuccess ? "Conexão SuperPayBR funcionando" : "Falha na conexão SuperPayBR",
      environment: {
        token_preview: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
        secret_preview: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
        api_url: apiUrl,
        webhook_url: webhookUrl,
      },
      test_results: results,
      working_urls: results.filter((r) => r.ok).map((r) => r.url),
      failed_urls: results.filter((r) => !r.ok).map((r) => r.url),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
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

export async function POST(request: NextRequest) {
  return GET(request)
}
