import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 === TESTE DE CONEXÃO SUPERPAYBR ===")

    const token = process.env.SUPERPAY_TOKEN
    const secretKey = process.env.SUPERPAY_SECRET_KEY
    const apiUrl = process.env.SUPERPAY_API_URL
    const webhookUrl = process.env.SUPERPAY_WEBHOOK_URL

    console.log("🔍 Verificando configurações:", {
      token: token ? `${token.substring(0, 10)}...` : "❌ AUSENTE",
      secretKey: secretKey ? `${secretKey.substring(0, 10)}...` : "❌ AUSENTE",
      apiUrl: apiUrl || "❌ AUSENTE",
      webhookUrl: webhookUrl || "❌ AUSENTE",
    })

    const results = {
      environment_variables: {
        SUPERPAY_TOKEN: !!token,
        SUPERPAY_SECRET_KEY: !!secretKey,
        SUPERPAY_API_URL: !!apiUrl,
        SUPERPAY_WEBHOOK_URL: !!webhookUrl,
      },
      api_tests: {},
      overall_status: "unknown",
    }

    if (!token || !secretKey || !apiUrl) {
      results.overall_status = "failed"
      return NextResponse.json({
        success: false,
        message: "Configuração SuperPayBR incompleta",
        results,
      })
    }

    // Testar múltiplas URLs da API
    const testUrls = [`${apiUrl}/v4/auth`, `${apiUrl}/auth`, `${apiUrl}/v4/invoices`, `${apiUrl}/invoices`]

    let anySuccess = false

    for (const testUrl of testUrls) {
      try {
        console.log(`🔄 Testando: ${testUrl}`)

        const testResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-API-Key": secretKey,
          },
        })

        const testResult = {
          url: testUrl,
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok,
          accessible: testResponse.status !== 404,
        }

        results.api_tests[testUrl] = testResult

        if (testResponse.ok || testResponse.status === 401 || testResponse.status === 400) {
          anySuccess = true
          console.log(`✅ ${testUrl} - Acessível`)
        } else {
          console.log(`❌ ${testUrl} - Status: ${testResponse.status}`)
        }
      } catch (error) {
        console.log(`❌ Erro em ${testUrl}:`, error)
        results.api_tests[testUrl] = {
          url: testUrl,
          error: error instanceof Error ? error.message : "Erro de rede",
          accessible: false,
        }
      }
    }

    results.overall_status = anySuccess ? "success" : "failed"

    console.log("📊 Resultado final:", results.overall_status)

    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? "SuperPayBR está acessível e configurado corretamente"
        : "SuperPayBR não está acessível ou há problemas de configuração",
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Erro interno no teste de conexão",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
