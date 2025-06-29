import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 === TESTE DE CONEXÃO SUPERPAYBR (BASIC AUTH) ===")

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
      basic_auth_test: null,
      bearer_token_test: null,
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

    // Criar Basic Auth base64
    const credentials = `${token}:${secretKey}`
    const base64Credentials = Buffer.from(credentials).toString("base64")

    console.log("🔑 Basic Auth criado:", `Basic ${base64Credentials.substring(0, 20)}...`)

    let accessToken = null

    // TESTE 1: Basic Auth para obter token
    try {
      console.log("🔐 Testando Basic Auth...")
      const authResponse = await fetch(`${apiUrl}/auth`, {
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

      results.basic_auth_test = {
        url: `${apiUrl}/auth`,
        status: authResponse.status,
        statusText: authResponse.statusText,
        ok: authResponse.ok,
        basic_auth_header: `Basic ${base64Credentials.substring(0, 20)}...`,
      }

      if (authResponse.ok) {
        const authData = await authResponse.json()
        accessToken = authData.access_token || authData.token
        console.log("✅ Basic Auth bem-sucedido!")
        console.log("🎫 Access token obtido:", accessToken ? `${accessToken.substring(0, 20)}...` : "❌ NULO")

        results.basic_auth_test.access_token_received = !!accessToken
        results.basic_auth_test.token_preview = accessToken ? `${accessToken.substring(0, 20)}...` : null
      } else {
        const errorText = await authResponse.text()
        console.log(`❌ Basic Auth falhou: ${errorText}`)
        results.basic_auth_test.error = errorText
      }
    } catch (error) {
      console.log("❌ Erro no teste Basic Auth:", error)
      results.basic_auth_test = {
        error: error instanceof Error ? error.message : "Erro de rede",
      }
    }

    // TESTE 2: Bearer Token (se obtido)
    if (accessToken) {
      try {
        console.log("🎫 Testando Bearer Token...")
        const bearerResponse = await fetch(`${apiUrl}/invoices`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })

        results.bearer_token_test = {
          url: `${apiUrl}/invoices`,
          status: bearerResponse.status,
          statusText: bearerResponse.statusText,
          ok: bearerResponse.ok,
          bearer_token_header: `Bearer ${accessToken.substring(0, 20)}...`,
        }

        if (bearerResponse.ok) {
          console.log("✅ Bearer Token funcionando!")
        } else {
          const errorText = await bearerResponse.text()
          console.log(`⚠️ Bearer Token retornou: ${bearerResponse.status} - ${errorText}`)
          results.bearer_token_test.error = errorText
        }
      } catch (error) {
        console.log("❌ Erro no teste Bearer Token:", error)
        results.bearer_token_test = {
          error: error instanceof Error ? error.message : "Erro de rede",
        }
      }
    }

    // TESTE 3: URLs da API
    const testUrls = [`${apiUrl}/invoices`, `${apiUrl}/payment`]

    for (const testUrl of testUrls) {
      try {
        console.log(`🔄 Testando URL: ${testUrl}`)

        const testResponse = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: accessToken ? `Bearer ${accessToken}` : `Basic ${base64Credentials}`,
          },
        })

        results.api_tests[testUrl] = {
          url: testUrl,
          status: testResponse.status,
          statusText: testResponse.statusText,
          ok: testResponse.ok,
          accessible: testResponse.status !== 404,
          auth_used: accessToken ? "Bearer" : "Basic",
        }

        console.log(`📊 ${testUrl}: ${testResponse.status} ${testResponse.statusText}`)
      } catch (error) {
        console.log(`❌ Erro em ${testUrl}:`, error)
        results.api_tests[testUrl] = {
          url: testUrl,
          error: error instanceof Error ? error.message : "Erro de rede",
          accessible: false,
        }
      }
    }

    // Determinar status geral
    const hasBasicAuth = results.basic_auth_test?.ok || false
    const hasBearerToken = results.bearer_token_test?.ok || false
    const hasApiAccess = Object.values(results.api_tests).some((test: any) => test.accessible)

    if (hasBasicAuth && accessToken) {
      results.overall_status = "success"
    } else if (hasBasicAuth || hasApiAccess) {
      results.overall_status = "partial"
    } else {
      results.overall_status = "failed"
    }

    console.log("📊 Resultado final:", results.overall_status)

    return NextResponse.json({
      success: results.overall_status === "success",
      message:
        results.overall_status === "success"
          ? "SuperPayBR está funcionando perfeitamente com Basic Auth + Bearer Token"
          : results.overall_status === "partial"
            ? "SuperPayBR está parcialmente acessível"
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
