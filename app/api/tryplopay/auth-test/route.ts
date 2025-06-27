import { NextResponse } from "next/server"

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    config: {
      token: !!process.env.TRYPLOPAY_TOKEN,
      tokenLength: process.env.TRYPLOPAY_TOKEN?.length || 0,
      apiUrl: process.env.TRYPLOPAY_API_URL,
      hasSecretKey: !!process.env.TRYPLOPAY_SECRET_KEY,
      webhookUrl: process.env.TRYPLOPAY_WEBHOOK_URL,
    },
    tokenAnalysis: {
      length: process.env.TRYPLOPAY_TOKEN?.length || 0,
      format: process.env.TRYPLOPAY_TOKEN ? "base64-like" : "not-configured",
      startsWithBearer: process.env.TRYPLOPAY_TOKEN?.startsWith("Bearer ") || false,
      hasSpecialChars: process.env.TRYPLOPAY_TOKEN ? /[^a-zA-Z0-9]/.test(process.env.TRYPLOPAY_TOKEN) : false,
    },
    testResults: [] as any[],
    recommendations: [] as string[],
  }

  if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_API_URL) {
    return NextResponse.json({
      success: false,
      error: "Configuração incompleta",
      ...debugInfo,
    })
  }

  const endpoints = [
    { endpoint: "/invoices", url: `${process.env.TRYPLOPAY_API_URL}/invoices` },
    { endpoint: "/user", url: `${process.env.TRYPLOPAY_API_URL}/user` },
    { endpoint: "/auth/check", url: `${process.env.TRYPLOPAY_API_URL}/auth/check` },
    { endpoint: "", url: process.env.TRYPLOPAY_API_URL },
  ]

  for (const { endpoint, url } of endpoints) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
          "User-Agent": "SHEIN-Checkout/1.0",
        },
      })

      const contentType = response.headers.get("content-type") || ""
      const isJson = contentType.includes("application/json")
      const isHtml = contentType.includes("text/html")

      let responseText = ""
      try {
        responseText = await response.text()
      } catch (error) {
        responseText = `Erro ao ler resposta: ${error}`
      }

      debugInfo.testResults.push({
        endpoint,
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType,
        responsePreview: responseText.substring(0, 200),
        isJson,
        isHtml,
      })
    } catch (error) {
      debugInfo.testResults.push({
        endpoint,
        url,
        status: 0,
        statusText: "Network Error",
        ok: false,
        contentType: "error",
        responsePreview: error instanceof Error ? error.message : String(error),
        isJson: false,
        isHtml: false,
      })
    }
  }

  // Gerar recomendações
  const hasSuccessfulRequests = debugInfo.testResults.some((result) => result.ok)
  const has401Errors = debugInfo.testResults.some((result) => result.status === 401)
  const has404Errors = debugInfo.testResults.some((result) => result.status === 404)

  if (!hasSuccessfulRequests) {
    debugInfo.recommendations.push("Verifique se o token está correto")
    debugInfo.recommendations.push("Confirme se a API URL está correta")
    debugInfo.recommendations.push("Teste com diferentes endpoints")
    debugInfo.recommendations.push("Verifique se precisa de headers adicionais")
  }

  if (has401Errors) {
    debugInfo.recommendations.push("Token inválido ou expirado - gere um novo token")
    debugInfo.recommendations.push("Verifique o formato do token")
  }

  if (has404Errors) {
    debugInfo.recommendations.push("Alguns endpoints não existem - isso é normal")
  }

  return NextResponse.json({
    success: hasSuccessfulRequests,
    ...debugInfo,
  })
}
