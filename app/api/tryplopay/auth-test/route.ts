import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[AUTH_TEST] Testando autenticação TryploPay...")

    // Teste 1: Verificar variáveis
    const config = {
      token: process.env.TRYPLOPAY_TOKEN,
      apiUrl: process.env.TRYPLOPAY_API_URL,
      secretKey: process.env.TRYPLOPAY_SECRET_KEY,
      webhookUrl: process.env.TRYPLOPAY_WEBHOOK_URL,
    }

    console.log("[AUTH_TEST] Config:", {
      token: config.token ? `${config.token.substring(0, 10)}...` : "undefined",
      apiUrl: config.apiUrl,
      hasSecretKey: !!config.secretKey,
      webhookUrl: config.webhookUrl,
    })

    if (!config.token || !config.apiUrl) {
      return NextResponse.json({
        success: false,
        error: "Configuração incompleta",
        config: {
          token: !!config.token,
          apiUrl: !!config.apiUrl,
        },
      })
    }

    // Teste 2: Tentar diferentes endpoints
    const testEndpoints = ["/invoices", "/user", "/auth/check", ""]

    const results = []

    for (const endpoint of testEndpoints) {
      const testUrl = `${config.apiUrl}${endpoint}`

      try {
        console.log(`[AUTH_TEST] Testando: ${testUrl}`)

        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${config.token}`,
            "User-Agent": "SHEIN-Auth-Test/1.0",
          },
          signal: AbortSignal.timeout(5000),
        })

        const responseText = await response.text()

        results.push({
          endpoint,
          url: testUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get("content-type"),
          responsePreview: responseText.substring(0, 200),
          isJson: responseText.startsWith("{") || responseText.startsWith("["),
          isHtml: responseText.includes("<!DOCTYPE") || responseText.includes("<html"),
        })

        console.log(`[AUTH_TEST] ${endpoint}: ${response.status} ${response.statusText}`)
      } catch (error) {
        results.push({
          endpoint,
          url: testUrl,
          error: error instanceof Error ? error.message : String(error),
          failed: true,
        })

        console.log(`[AUTH_TEST] ${endpoint}: ERRO - ${error}`)
      }
    }

    // Teste 3: Verificar formato do token
    const tokenAnalysis = {
      length: config.token.length,
      format: /^[A-Za-z0-9+/=]+$/.test(config.token) ? "base64-like" : "other",
      startsWithBearer: config.token.startsWith("Bearer "),
      hasSpecialChars: /[^A-Za-z0-9+/=]/.test(config.token),
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      config: {
        token: !!config.token,
        tokenLength: config.token.length,
        apiUrl: config.apiUrl,
        hasSecretKey: !!config.secretKey,
        webhookUrl: config.webhookUrl,
      },
      tokenAnalysis,
      testResults: results,
      recommendations: [
        "Verifique se o token está correto",
        "Confirme se a API URL está correta",
        "Teste com diferentes endpoints",
        "Verifique se precisa de headers adicionais",
      ],
    })
  } catch (error) {
    console.error("[AUTH_TEST] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro no teste de autenticação",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
