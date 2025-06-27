import { NextResponse } from "next/server"

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    config: {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN
          ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 5)}...${process.env.TRYPLOPAY_TOKEN.substring(-3)}`
          : "undefined",
        full_value: process.env.TRYPLOPAY_TOKEN || "undefined",
      },
      TRYPLOPAY_API_URL: {
        exists: !!process.env.TRYPLOPAY_API_URL,
        value: process.env.TRYPLOPAY_API_URL || "undefined",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 5)}...${process.env.TRYPLOPAY_SECRET_KEY.substring(-3)}`
          : "undefined",
        full_value: process.env.TRYPLOPAY_SECRET_KEY || "undefined",
      },
      TRYPLOPAY_WEBHOOK_URL: {
        exists: !!process.env.TRYPLOPAY_WEBHOOK_URL,
        value: process.env.TRYPLOPAY_WEBHOOK_URL || "undefined",
      },
    },
    auth_tests: [] as any[],
    errors: [] as string[],
    recommendations: [] as string[],
  }

  // Verificar se as variáveis existem
  if (!process.env.TRYPLOPAY_TOKEN) {
    debugInfo.errors.push("TRYPLOPAY_TOKEN não está definido")
    debugInfo.recommendations.push("Configure TRYPLOPAY_TOKEN no Vercel")
  }

  if (!process.env.TRYPLOPAY_API_URL) {
    debugInfo.errors.push("TRYPLOPAY_API_URL não está definido")
    debugInfo.recommendations.push("Configure TRYPLOPAY_API_URL=https://api.tryplopay.com")
  }

  if (!process.env.TRYPLOPAY_SECRET_KEY) {
    debugInfo.errors.push("TRYPLOPAY_SECRET_KEY não está definido")
    debugInfo.recommendations.push("Configure TRYPLOPAY_SECRET_KEY no Vercel")
  }

  // Se variáveis não existem, retornar erro
  if (debugInfo.errors.length > 0) {
    return NextResponse.json({
      success: false,
      error: "Configuração incompleta",
      debug: debugInfo,
    })
  }

  // Teste 1: Método Bearer Token apenas
  try {
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
      },
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw_response: responseText.substring(0, 200) }
    }

    debugInfo.auth_tests.push({
      method: "Bearer Token Only",
      status: response.status,
      success: response.ok,
      headers_sent: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...`,
      },
      response: parsedResponse,
      response_headers: Object.fromEntries(response.headers),
    })
  } catch (error) {
    debugInfo.auth_tests.push({
      method: "Bearer Token Only",
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 2: Bearer Token + X-Secret-Key
  try {
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
        "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY,
      },
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw_response: responseText.substring(0, 200) }
    }

    debugInfo.auth_tests.push({
      method: "Bearer Token + X-Secret-Key",
      status: response.status,
      success: response.ok,
      headers_sent: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...`,
        "X-Secret-Key": `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 10)}...`,
      },
      response: parsedResponse,
      response_headers: Object.fromEntries(response.headers),
    })
  } catch (error) {
    debugInfo.auth_tests.push({
      method: "Bearer Token + X-Secret-Key",
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 3: Basic Auth
  try {
    const basicAuth = Buffer.from(`${process.env.TRYPLOPAY_TOKEN}:${process.env.TRYPLOPAY_SECRET_KEY}`).toString(
      "base64",
    )
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw_response: responseText.substring(0, 200) }
    }

    debugInfo.auth_tests.push({
      method: "Basic Auth (Token:SecretKey)",
      status: response.status,
      success: response.ok,
      headers_sent: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth.substring(0, 20)}...`,
      },
      response: parsedResponse,
      response_headers: Object.fromEntries(response.headers),
    })
  } catch (error) {
    debugInfo.auth_tests.push({
      method: "Basic Auth (Token:SecretKey)",
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Teste 4: API Key no header
  try {
    const response = await fetch(`${process.env.TRYPLOPAY_API_URL}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": process.env.TRYPLOPAY_TOKEN,
        "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY,
      },
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw_response: responseText.substring(0, 200) }
    }

    debugInfo.auth_tests.push({
      method: "X-API-Key + X-Secret-Key",
      status: response.status,
      success: response.ok,
      headers_sent: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Key": `${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...`,
        "X-Secret-Key": `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 10)}...`,
      },
      response: parsedResponse,
      response_headers: Object.fromEntries(response.headers),
    })
  } catch (error) {
    debugInfo.auth_tests.push({
      method: "X-API-Key + X-Secret-Key",
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Analisar resultados
  const workingMethods = debugInfo.auth_tests.filter((test) => test.success)
  const unauthorizedMethods = debugInfo.auth_tests.filter((test) => test.status === 401)

  if (workingMethods.length === 0) {
    debugInfo.errors.push("Nenhum método de autenticação funcionou")

    if (unauthorizedMethods.length === debugInfo.auth_tests.length) {
      debugInfo.errors.push("Todos os métodos retornaram 401 - Token ou Secret Key inválidos")
      debugInfo.recommendations.push("🔑 Verifique se o TRYPLOPAY_TOKEN está correto")
      debugInfo.recommendations.push("🔐 Verifique se o TRYPLOPAY_SECRET_KEY está correto")
      debugInfo.recommendations.push("📅 Verifique se o token não expirou")
      debugInfo.recommendations.push("🌐 Confirme se está usando a URL correta da API")
      debugInfo.recommendations.push("📞 Entre em contato com o suporte da TryploPay")
    }
  } else {
    debugInfo.recommendations.push(`✅ ${workingMethods.length} método(s) de autenticação funcionando`)
    workingMethods.forEach((method) => {
      debugInfo.recommendations.push(`✓ Use: ${method.method}`)
    })
  }

  return NextResponse.json({
    success: workingMethods.length > 0,
    working_methods: workingMethods.length,
    total_methods_tested: debugInfo.auth_tests.length,
    status: workingMethods.length > 0 ? "✅ Autenticação funcionando" : "❌ Falha na autenticação",
    debug: debugInfo,
  })
}

export async function POST() {
  // Teste de criação de fatura com método que funciona
  const token = process.env.TRYPLOPAY_TOKEN
  const apiUrl = process.env.TRYPLOPAY_API_URL
  const secretKey = process.env.TRYPLOPAY_SECRET_KEY

  if (!token || !apiUrl || !secretKey) {
    return NextResponse.json({
      success: false,
      error: "Configuração incompleta",
      missing: {
        token: !token,
        apiUrl: !apiUrl,
        secretKey: !secretKey,
      },
    })
  }

  const testPayload = {
    client: {
      name: "Cliente Teste Debug",
      document: "12345678901",
      email: "debug@teste.com",
      phone: "11999999999",
      address: {
        street: "Rua Debug",
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
      referer: `DEBUG_${Date.now()}`,
      installments: 1,
      webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
      products: [
        {
          id: "1",
          title: "Teste Debug - PIX",
          qnt: 1,
          amount: 1.0,
        },
      ],
    },
    shipping: {
      amount: 0,
    },
  }

  const authMethods = [
    {
      name: "Bearer Token + X-Secret-Key",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Secret-Key": secretKey,
      },
    },
    {
      name: "Bearer Token Only",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: "Basic Auth",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
      },
    },
  ]

  const results = []

  for (const method of authMethods) {
    try {
      const response = await fetch(`${apiUrl}/invoices`, {
        method: "POST",
        headers: method.headers,
        body: JSON.stringify(testPayload),
      })

      const responseText = await response.text()
      let parsedResponse

      try {
        parsedResponse = JSON.parse(responseText)
      } catch {
        parsedResponse = { raw_response: responseText.substring(0, 300) }
      }

      results.push({
        method: method.name,
        status: response.status,
        success: response.ok,
        response: parsedResponse,
        headers_sent: {
          ...method.headers,
          Authorization: method.headers.Authorization.substring(0, 20) + "...",
        },
      })

      // Se funcionou, parar aqui
      if (response.ok) {
        break
      }
    } catch (error) {
      results.push({
        method: method.name,
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const successfulMethod = results.find((r) => r.success)

  return NextResponse.json({
    success: !!successfulMethod,
    successful_method: successfulMethod?.method || null,
    test_payload: testPayload,
    results,
    recommendation: successfulMethod
      ? `Use o método: ${successfulMethod.method}`
      : "Nenhum método de autenticação funcionou - verifique as credenciais",
  })
}
