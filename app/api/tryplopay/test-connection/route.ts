import { NextResponse } from "next/server"

// Função para criar Basic Auth header
function createBasicAuthHeader(token: string, secretKey: string): string {
  const credentials = `${token}:${secretKey}`
  const base64Credentials = Buffer.from(credentials).toString("base64")
  return `Basic ${base64Credentials}`
}

export async function GET() {
  const testResults = {
    success: false,
    timestamp: new Date().toISOString(),
    tryplopay_config: {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 8)}...` : "❌ Não definido",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 8)}...`
          : "❌ Não definido",
      },
      TRYPLOPAY_API_URL: {
        exists: !!process.env.TRYPLOPAY_API_URL,
        value: process.env.TRYPLOPAY_API_URL || "❌ Não definido",
      },
      TRYPLOPAY_WEBHOOK_URL: {
        exists: !!process.env.TRYPLOPAY_WEBHOOK_URL,
        value: process.env.TRYPLOPAY_WEBHOOK_URL || "❌ Não definido",
      },
    },
    tests: [] as any[],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
    },
    recommendations: [] as string[],
  }

  // Teste 1: Verificar configuração
  testResults.tests.push({
    name: "Configuração de Variáveis",
    status:
      testResults.tryplopay_config.TRYPLOPAY_TOKEN.exists &&
      testResults.tryplopay_config.TRYPLOPAY_SECRET_KEY.exists &&
      testResults.tryplopay_config.TRYPLOPAY_API_URL.exists
        ? "✅ PASS"
        : "❌ FAIL",
    message: "Verificando se todas as variáveis estão configuradas",
    details: testResults.tryplopay_config,
  })

  if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_SECRET_KEY || !process.env.TRYPLOPAY_API_URL) {
    testResults.tests.push({
      name: "Configuração Incompleta",
      status: "❌ FAIL",
      message: "Variáveis de ambiente não configuradas",
      error: "Configure TRYPLOPAY_TOKEN, TRYPLOPAY_SECRET_KEY e TRYPLOPAY_API_URL",
    })

    testResults.recommendations.push("Configure todas as variáveis de ambiente necessárias")
    testResults.recommendations.push("Verifique o arquivo .env.local")
    testResults.recommendations.push("Reinicie o servidor após configurar")

    return NextResponse.json(testResults)
  }

  const token = process.env.TRYPLOPAY_TOKEN
  const secretKey = process.env.TRYPLOPAY_SECRET_KEY
  const apiUrl = process.env.TRYPLOPAY_API_URL

  // Teste 2: Conectividade básica
  try {
    const connectivityTest = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "SHEIN-Test/1.0",
      },
    })

    testResults.tests.push({
      name: "Conectividade com API",
      status: connectivityTest.status < 500 ? "✅ PASS" : "❌ FAIL",
      message: `Testando conectividade com ${apiUrl}`,
      details: {
        status: connectivityTest.status,
        statusText: connectivityTest.statusText,
      },
    })
  } catch (error) {
    testResults.tests.push({
      name: "Conectividade com API",
      status: "❌ FAIL",
      message: "Erro de conectividade",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 3: Autenticação Basic Auth - USAR HEADER COMPLETO
  try {
    const basicAuthHeader = createBasicAuthHeader(token, secretKey)
    const authTest = await fetch(`${apiUrl}/auth`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader, // USAR HEADER COMPLETO
        "User-Agent": "SHEIN-Auth-Test/1.0",
      },
    })

    const authResponseText = await authTest.text()
    let authData
    try {
      authData = JSON.parse(authResponseText)
    } catch {
      authData = { raw: authResponseText.substring(0, 200) }
    }

    const authSuccess = authTest.ok && !authData.error

    testResults.tests.push({
      name: "Autenticação Basic Auth",
      status: authSuccess ? "✅ PASS" : "❌ FAIL",
      message: "Testando autenticação com Basic Auth",
      details: {
        status: authTest.status,
        statusText: authTest.statusText,
        response: authData,
      },
    })

    if (authSuccess) {
      testResults.success = true
    }
  } catch (error) {
    testResults.tests.push({
      name: "Autenticação Basic Auth",
      status: "❌ FAIL",
      message: "Erro na autenticação",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 4: Endpoint de faturas - USAR HEADER COMPLETO
  try {
    const basicAuthHeader = createBasicAuthHeader(token, secretKey)
    const invoicesTest = await fetch(`${apiUrl}/invoices?p=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: basicAuthHeader, // USAR HEADER COMPLETO
        "User-Agent": "SHEIN-Invoices-Test/1.0",
      },
    })

    const invoicesResponseText = await invoicesTest.text()
    let invoicesData
    try {
      invoicesData = JSON.parse(invoicesResponseText)
    } catch {
      invoicesData = { raw: invoicesResponseText.substring(0, 200) }
    }

    const invoicesSuccess = invoicesTest.ok && !invoicesData.error

    testResults.tests.push({
      name: "Endpoint de Faturas",
      status: invoicesSuccess ? "✅ PASS" : "⚠️ WARN",
      message: "Testando acesso ao endpoint de faturas",
      details: {
        status: invoicesTest.status,
        statusText: invoicesTest.statusText,
        response: invoicesData,
      },
    })
  } catch (error) {
    testResults.tests.push({
      name: "Endpoint de Faturas",
      status: "⚠️ WARN",
      message: "Erro no teste de faturas",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 5: Webhook URL
  if (process.env.TRYPLOPAY_WEBHOOK_URL) {
    try {
      const webhookUrl = new URL(process.env.TRYPLOPAY_WEBHOOK_URL)
      testResults.tests.push({
        name: "Webhook URL",
        status: webhookUrl.protocol === "https:" ? "✅ PASS" : "⚠️ WARN",
        message: "Verificando formato da URL do webhook",
        details: {
          url: process.env.TRYPLOPAY_WEBHOOK_URL,
          protocol: webhookUrl.protocol,
          host: webhookUrl.host,
        },
      })
    } catch (error) {
      testResults.tests.push({
        name: "Webhook URL",
        status: "❌ FAIL",
        message: "URL do webhook inválida",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  } else {
    testResults.tests.push({
      name: "Webhook URL",
      status: "⚠️ WARN",
      message: "Webhook URL não configurada",
      details: "Configure TRYPLOPAY_WEBHOOK_URL para receber notificações",
    })
  }

  // Calcular resumo
  testResults.summary.total = testResults.tests.length
  testResults.summary.passed = testResults.tests.filter((t) => t.status.includes("✅")).length
  testResults.summary.failed = testResults.tests.filter((t) => t.status.includes("❌")).length

  // Gerar recomendações
  if (testResults.success) {
    testResults.recommendations.push("✅ Configuração básica está funcionando")
    testResults.recommendations.push("Teste a criação de PIX em /checkout")
    testResults.recommendations.push("Monitore webhooks em /webhook-monitor")
  } else {
    testResults.recommendations.push("Verifique se o token e secret key estão corretos")
    testResults.recommendations.push("Confirme se a API URL está correta")
    testResults.recommendations.push("Execute /debug-tryplopay para diagnóstico completo")
  }

  return NextResponse.json(testResults)
}
