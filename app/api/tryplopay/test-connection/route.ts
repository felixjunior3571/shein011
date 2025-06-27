import { NextResponse } from "next/server"

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
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

  // Teste 1: Verificar conectividade básica
  try {
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
        "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY,
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
      test: "Conectividade API",
      status: response.status,
      success: response.ok,
      response: parsedResponse,
      headers: Object.fromEntries(response.headers),
    })

    if (!response.ok) {
      debugInfo.errors.push(
        `Erro de autenticação: ${response.status} - ${parsedResponse.message || parsedResponse.error || "Unauthorized"}`,
      )
    }
  } catch (error) {
    debugInfo.errors.push(`Erro de conexão: ${error instanceof Error ? error.message : String(error)}`)
    debugInfo.tests.push({
      test: "Conectividade API",
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
          Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
          "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY,
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
        test: "Criação de Fatura",
        status: response.status,
        success: response.ok,
        response: parsedResponse,
        payload: testPayload,
      })

      if (response.ok) {
        debugInfo.warnings.push("✅ Teste de criação de fatura bem-sucedido")
      } else {
        debugInfo.errors.push(
          `Erro na criação de fatura: ${response.status} - ${parsedResponse.message || parsedResponse.error}`,
        )
      }
    } catch (error) {
      debugInfo.errors.push(`Erro no teste de criação: ${error instanceof Error ? error.message : String(error)}`)
      debugInfo.tests.push({
        test: "Criação de Fatura",
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
    status: isFullyWorking ? "✅ Totalmente funcional" : "❌ Problemas encontrados",
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
    recommendations: isFullyWorking
      ? ["Sistema funcionando corretamente", "Pode usar PIX real em produção"]
      : [
          "Verifique as credenciais da TryploPay",
          "Confirme se o token não expirou",
          "Verifique se a Secret Key está correta",
          "Entre em contato com suporte TryploPay se necessário",
        ],
    debug: debugInfo,
  })
}
