import { NextResponse } from "next/server"

// Função para criar Basic Auth header
function createBasicAuthHeader(token: string, secretKey: string): string {
  const credentials = `${token}:${secretKey}`
  const base64Credentials = Buffer.from(credentials).toString("base64")
  return `Basic ${base64Credentials}`
}

// Função para testar diferentes métodos de autenticação
async function testAuthMethod(
  method: string,
  url: string,
  headers: Record<string, string>,
): Promise<{ method: string; endpoint: string; status: number; success: boolean; response?: any; error?: string }> {
  try {
    console.log(`[DEBUG] Testando ${method} em ${url}`)

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "SHEIN-Debug/1.0",
        ...headers, // USAR HEADERS COMPLETOS
      },
    })

    const contentType = response.headers.get("content-type") || ""
    const isJson = contentType.includes("application/json")

    let responseData
    try {
      const responseText = await response.text()
      responseData = isJson ? JSON.parse(responseText) : { raw: responseText.substring(0, 200) }
    } catch (parseError) {
      responseData = { parse_error: "Erro ao fazer parse da resposta" }
    }

    const success = response.ok && !responseData.error

    console.log(`[DEBUG] ${method}: ${response.status} - ${success ? "✅" : "❌"}`)

    return {
      method,
      endpoint: url,
      status: response.status,
      success,
      response: responseData,
    }
  } catch (error) {
    console.log(`[DEBUG] ${method}: Erro de conexão - ❌`)
    return {
      method,
      endpoint: url,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function GET() {
  const debugResult = {
    success: false,
    status: "Configuração incompleta",
    working_methods: [] as string[],
    recommended_method: "",
    summary: {
      total_tests: 0,
      successful_tests: 0,
      failed_tests: 0,
      errors: 0,
      warnings: 0,
    },
    errors: [] as string[],
    warnings: [] as string[],
    tests: [] as any[],
    config: {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...` : "Não configurado",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 10)}...`
          : "Não configurado",
      },
      TRYPLOPAY_API_URL: process.env.TRYPLOPAY_API_URL || "Não configurado",
      TRYPLOPAY_WEBHOOK_URL: process.env.TRYPLOPAY_WEBHOOK_URL || "Não configurado",
    },
    recommendations: [] as string[],
  }

  // Verificar configuração básica
  if (!process.env.TRYPLOPAY_TOKEN) {
    debugResult.errors.push("TRYPLOPAY_TOKEN não configurado")
  }

  if (!process.env.TRYPLOPAY_SECRET_KEY) {
    debugResult.errors.push("TRYPLOPAY_SECRET_KEY não configurado")
  }

  if (!process.env.TRYPLOPAY_API_URL) {
    debugResult.errors.push("TRYPLOPAY_API_URL não configurado")
  }

  if (debugResult.errors.length > 0) {
    debugResult.recommendations.push("Configure todas as variáveis de ambiente necessárias")
    debugResult.recommendations.push("Verifique o arquivo .env.local ou as configurações do Vercel")
    return NextResponse.json(debugResult)
  }

  // Preparar diferentes métodos de autenticação para teste
  const token = process.env.TRYPLOPAY_TOKEN!
  const secretKey = process.env.TRYPLOPAY_SECRET_KEY!
  const apiUrl = process.env.TRYPLOPAY_API_URL!

  // USAR HEADERS COMPLETOS, NÃO TRUNCADOS
  const authMethods = [
    {
      name: "Basic Auth (Recomendado)",
      headers: {
        Authorization: createBasicAuthHeader(token, secretKey), // HEADER COMPLETO
      },
    },
    {
      name: "Bearer Token",
      headers: {
        Authorization: `Bearer ${token}`, // HEADER COMPLETO
      },
    },
    {
      name: "Token Header",
      headers: {
        Token: token, // HEADER COMPLETO
      },
    },
    {
      name: "API Key Header",
      headers: {
        "X-API-Key": token, // HEADER COMPLETO
      },
    },
  ]

  // Endpoints para testar
  const endpoints = [
    { name: "Auth", path: "/auth" },
    { name: "Invoices", path: "/invoices" },
    { name: "Customers", path: "/costumers" },
    { name: "Root", path: "" },
  ]

  // Executar testes
  for (const authMethod of authMethods) {
    for (const endpoint of endpoints) {
      const testUrl = `${apiUrl}${endpoint.path}`
      const result = await testAuthMethod(`${authMethod.name} - ${endpoint.name}`, testUrl, authMethod.headers)

      debugResult.tests.push(result)
      debugResult.summary.total_tests++

      if (result.success) {
        debugResult.summary.successful_tests++
        if (!debugResult.working_methods.includes(authMethod.name)) {
          debugResult.working_methods.push(authMethod.name)
        }
      } else {
        debugResult.summary.failed_tests++
      }
    }
  }

  // Determinar método recomendado
  if (debugResult.working_methods.length > 0) {
    debugResult.success = true
    debugResult.recommended_method = debugResult.working_methods[0]
    debugResult.status = `${debugResult.working_methods.length} método(s) funcionando`
  } else {
    debugResult.status = "Nenhum método de autenticação funcionando"
    debugResult.errors.push("Nenhum método de autenticação foi bem-sucedido")
  }

  // Gerar recomendações
  if (debugResult.working_methods.includes("Basic Auth (Recomendado)")) {
    debugResult.recommendations.push("✅ Basic Auth está funcionando - método recomendado pela TryploPay")
  } else if (debugResult.working_methods.length > 0) {
    debugResult.recommendations.push(`Use o método: ${debugResult.recommended_method}`)
    debugResult.warnings.push("Basic Auth não está funcionando, mas outros métodos sim")
  } else {
    debugResult.recommendations.push("Verifique se o token e secret key estão corretos")
    debugResult.recommendations.push("Confirme se a API URL está correta")
    debugResult.recommendations.push("Teste manualmente no Postman ou similar")
    debugResult.recommendations.push("Entre em contato com o suporte da TryploPay")
  }

  // Contar erros e avisos
  debugResult.summary.errors = debugResult.errors.length
  debugResult.summary.warnings = debugResult.warnings.length

  console.log("[DEBUG] Resultado final:", {
    success: debugResult.success,
    working_methods: debugResult.working_methods,
    total_tests: debugResult.summary.total_tests,
    successful_tests: debugResult.summary.successful_tests,
  })

  return NextResponse.json(debugResult)
}

// Endpoint POST para testar criação de fatura
export async function POST() {
  const testResult = {
    success: false,
    successful_method: "",
    results: [] as any[],
    recommendation: "",
  }

  if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_SECRET_KEY || !process.env.TRYPLOPAY_API_URL) {
    testResult.recommendation = "Configure as variáveis de ambiente primeiro"
    return NextResponse.json(testResult)
  }

  const token = process.env.TRYPLOPAY_TOKEN
  const secretKey = process.env.TRYPLOPAY_SECRET_KEY
  const apiUrl = process.env.TRYPLOPAY_API_URL

  // Payload de teste simples
  const testPayload = {
    client: {
      name: "Teste Debug",
      document: "12345678901",
      email: "teste@debug.com",
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
      external_id: `DEBUG_${Date.now()}`,
      type: 1,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      referer: "debug_test",
      installments: 1,
      webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
      products: [
        {
          id: "1",
          title: "Teste Debug",
          qnt: 1,
          amount: 10.0,
        },
      ],
    },
    shipping: {
      amount: 0,
    },
  }

  // Testar diferentes métodos - USAR HEADERS COMPLETOS
  const authMethods = [
    {
      name: "Basic Auth",
      headers: {
        Authorization: createBasicAuthHeader(token, secretKey), // HEADER COMPLETO
      },
    },
    {
      name: "Bearer Token",
      headers: {
        Authorization: `Bearer ${token}`, // HEADER COMPLETO
      },
    },
  ]

  for (const method of authMethods) {
    try {
      const response = await fetch(`${apiUrl}/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "SHEIN-Debug-Create/1.0",
          ...method.headers, // USAR HEADERS COMPLETOS
        },
        body: JSON.stringify(testPayload),
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        responseData = { raw: responseText.substring(0, 200) }
      }

      const success = response.ok && !responseData.error

      testResult.results.push({
        method: method.name,
        status: response.status,
        success,
        response: responseData,
      })

      if (success && !testResult.successful_method) {
        testResult.success = true
        testResult.successful_method = method.name
      }
    } catch (error) {
      testResult.results.push({
        method: method.name,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (testResult.success) {
    testResult.recommendation = `Criação de fatura funcionando com ${testResult.successful_method}`
  } else {
    testResult.recommendation = "Nenhum método conseguiu criar fatura. Verifique as credenciais."
  }

  return NextResponse.json(testResult)
}
