import { NextResponse } from "next/server"

// Função para criar Basic Auth header
function createBasicAuthHeader(token: string, secretKey: string): string {
  const credentials = `${token}:${secretKey}`
  const base64Credentials = Buffer.from(credentials).toString("base64")
  return `Basic ${base64Credentials}`
}

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    auth_method: "Basic Auth (Correto conforme documentação)",
    config: {
      token: !!process.env.TRYPLOPAY_TOKEN,
      tokenLength: process.env.TRYPLOPAY_TOKEN?.length || 0,
      apiUrl: process.env.TRYPLOPAY_API_URL,
      hasSecretKey: !!process.env.TRYPLOPAY_SECRET_KEY,
      secretKeyLength: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
      webhookUrl: process.env.TRYPLOPAY_WEBHOOK_URL,
    },
    tests: [] as any[],
    errors: [] as string[],
    warnings: [] as string[],
  }

  // Verificar configuração obrigatória
  if (!process.env.TRYPLOPAY_TOKEN) {
    debugInfo.errors.push("TRYPLOPAY_TOKEN não configurado")
  }

  if (!process.env.TRYPLOPAY_API_URL) {
    debugInfo.errors.push("TRYPLOPAY_API_URL não configurado")
  }

  if (!process.env.TRYPLOPAY_SECRET_KEY) {
    debugInfo.errors.push("TRYPLOPAY_SECRET_KEY não configurado")
  }

  if (debugInfo.errors.length > 0) {
    return NextResponse.json({
      success: false,
      error: "Configuração incompleta",
      missing_config: debugInfo.errors,
      debug: debugInfo,
    })
  }

  // Criar Basic Auth header
  const basicAuthHeader = createBasicAuthHeader(process.env.TRYPLOPAY_TOKEN!, process.env.TRYPLOPAY_SECRET_KEY!)

  // Teste 1: Verificar conectividade básica com Basic Auth
  try {
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader,
        "User-Agent": "SHEIN-Test/1.0",
      },
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw: responseText.substring(0, 200) }
    }

    debugInfo.tests.push({
      test: "Conectividade API (Basic Auth)",
      status: response.status,
      success: response.ok,
      response: parsedResponse,
      headers: Object.fromEntries(response.headers),
      auth_header: `Basic ${Buffer.from(`${process.env.TRYPLOPAY_TOKEN}:${process.env.TRYPLOPAY_SECRET_KEY}`).toString("base64").substring(0, 20)}...`,
    })

    if (!response.ok) {
      debugInfo.errors.push(
        `Erro de autenticação: ${response.status} - ${parsedResponse.message || parsedResponse.error || "Unauthorized"}`,
      )
    } else {
      debugInfo.warnings.push("✅ Autenticação Basic Auth funcionando!")
    }
  } catch (error) {
    debugInfo.errors.push(`Erro de conexão: ${error instanceof Error ? error.message : String(error)}`)
    debugInfo.tests.push({
      test: "Conectividade API (Basic Auth)",
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 2: Criar fatura de teste (apenas se autenticação passou)
  if (debugInfo.errors.length === 0) {
    try {
      const testPayload = {
        client: {
          name: "Cliente Teste",
          document: "12345678901",
          email: "teste@exemplo.com",
          phone: "11999999999",
          address: {
            street: "Rua Teste",
            number: "123",
            district: "Centro",
            city: "São Paulo",
            state: "SP",
            zipcode: "01000000",
            country: "BRA",
          },
          ip: "127.0.0.1",
        },
        payment: {
          product_type: 1,
          external_id: `TEST_${Date.now()}`,
          type: 1,
          due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          referer: `TEST_${Date.now()}`,
          installments: 1,
          webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
          products: [
            {
              id: "1",
              title: "Produto Teste",
              qnt: 1,
              amount: 1.0,
            },
          ],
        },
        shipping: {
          amount: 0,
        },
      }

      const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: basicAuthHeader,
          "User-Agent": "SHEIN-Test/1.0",
        },
        body: JSON.stringify(testPayload),
      })

      const responseText = await response.text()
      let parsedResponse

      try {
        parsedResponse = JSON.parse(responseText)
      } catch {
        parsedResponse = { raw: responseText.substring(0, 200) }
      }

      debugInfo.tests.push({
        test: "Criação de Fatura (Basic Auth)",
        status: response.status,
        success: response.ok,
        response: parsedResponse,
        payload: testPayload,
        auth_method: "Basic Auth",
      })

      if (response.ok) {
        debugInfo.warnings.push("✅ Teste de criação de fatura bem-sucedido com Basic Auth!")

        // Verificar se PIX foi gerado
        const invoiceData = parsedResponse.fatura || parsedResponse.invoice || parsedResponse
        const pixCode = invoiceData.pix?.payload || invoiceData.pix_code

        if (pixCode) {
          debugInfo.warnings.push("✅ PIX code gerado com sucesso!")
        } else {
          debugInfo.warnings.push("⚠️ Fatura criada mas PIX code não encontrado")
        }
      } else {
        debugInfo.errors.push(
          `Erro na criação de fatura: ${response.status} - ${parsedResponse.message || parsedResponse.error}`,
        )
      }
    } catch (error) {
      debugInfo.errors.push(`Erro no teste de criação: ${error instanceof Error ? error.message : String(error)}`)
      debugInfo.tests.push({
        test: "Criação de Fatura (Basic Auth)",
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const isFullyWorking = debugInfo.errors.length === 0
  const hasPartialIssues = debugInfo.warnings.length > 0

  return NextResponse.json({
    success: isFullyWorking,
    status: isFullyWorking ? "✅ Totalmente funcional com Basic Auth" : "❌ Problemas encontrados",
    auth_method: "Basic Auth (Conforme documentação TryploPay)",
    summary: {
      total_tests: debugInfo.tests.length,
      successful_tests: debugInfo.tests.filter((t) => t.success).length,
      failed_tests: debugInfo.tests.filter((t) => !t.success).length,
      errors: debugInfo.errors.length,
      warnings: debugInfo.warnings.length,
    },
    errors: debugInfo.errors,
    warnings: debugInfo.warnings,
    tests: debugInfo.tests,
    config: debugInfo.config,
    basic_auth_example: {
      format: "Authorization: Basic base64(TOKEN:SECRET_KEY)",
      your_credentials: `${process.env.TRYPLOPAY_TOKEN}:${process.env.TRYPLOPAY_SECRET_KEY?.substring(0, 10)}...`,
      base64_preview:
        Buffer.from(`${process.env.TRYPLOPAY_TOKEN}:${process.env.TRYPLOPAY_SECRET_KEY}`)
          .toString("base64")
          .substring(0, 30) + "...",
    },
    recommendations: isFullyWorking
      ? ["✅ Sistema funcionando corretamente com Basic Auth", "✅ Pode usar PIX real em produção"]
      : [
          "🔧 Agora usando Basic Auth conforme documentação",
          "🔑 Verifique se TOKEN e SECRET_KEY estão corretos",
          "📋 Consulte /api/tryplopay/fix-credentials para ajuda",
          "📞 Entre em contato com suporte TryploPay se necessário",
        ],
    debug: debugInfo,
  })
}
