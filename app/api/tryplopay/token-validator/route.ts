import { NextResponse } from "next/server"

interface TokenTestResult {
  method: string
  headers: Record<string, string>
  status: number
  success: boolean
  response: any
  error?: string
}

export async function GET() {
  const results: TokenTestResult[] = []
  const token = process.env.TRYPLOPAY_TOKEN
  const apiUrl = process.env.TRYPLOPAY_API_URL
  const secretKey = process.env.TRYPLOPAY_SECRET_KEY

  if (!token || !apiUrl) {
    return NextResponse.json({
      error: "Token ou API URL não configurados",
      token_exists: !!token,
      api_url_exists: !!apiUrl,
    })
  }

  // Método 1: Bearer Token simples
  try {
    const response = await fetch(`${apiUrl}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await response.text()
    results.push({
      method: "Bearer Token",
      headers: { Authorization: `Bearer ${token.substring(0, 10)}...` },
      status: response.status,
      success: response.ok,
      response: data.substring(0, 200),
    })
  } catch (error) {
    results.push({
      method: "Bearer Token",
      headers: { Authorization: `Bearer ${token.substring(0, 10)}...` },
      status: 0,
      success: false,
      response: "",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Método 2: Token direto no header
  try {
    const response = await fetch(`${apiUrl}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Token": token,
      },
    })
    const data = await response.text()
    results.push({
      method: "X-API-Token",
      headers: { "X-API-Token": `${token.substring(0, 10)}...` },
      status: response.status,
      success: response.ok,
      response: data.substring(0, 200),
    })
  } catch (error) {
    results.push({
      method: "X-API-Token",
      headers: { "X-API-Token": `${token.substring(0, 10)}...` },
      status: 0,
      success: false,
      response: "",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Método 3: Com Secret Key
  if (secretKey) {
    try {
      const response = await fetch(`${apiUrl}/invoices`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "X-Secret-Key": secretKey,
        },
      })
      const data = await response.text()
      results.push({
        method: "Bearer + Secret Key",
        headers: {
          Authorization: `Bearer ${token.substring(0, 10)}...`,
          "X-Secret-Key": `${secretKey.substring(0, 10)}...`,
        },
        status: response.status,
        success: response.ok,
        response: data.substring(0, 200),
      })
    } catch (error) {
      results.push({
        method: "Bearer + Secret Key",
        headers: {
          Authorization: `Bearer ${token.substring(0, 10)}...`,
          "X-Secret-Key": `${secretKey.substring(0, 10)}...`,
        },
        status: 0,
        success: false,
        response: "",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Método 4: Basic Auth
  try {
    const basicAuth = Buffer.from(`${token}:`).toString("base64")
    const response = await fetch(`${apiUrl}/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
    })
    const data = await response.text()
    results.push({
      method: "Basic Auth",
      headers: { Authorization: `Basic ${basicAuth.substring(0, 10)}...` },
      status: response.status,
      success: response.ok,
      response: data.substring(0, 200),
    })
  } catch (error) {
    results.push({
      method: "Basic Auth",
      headers: { Authorization: "Basic ..." },
      status: 0,
      success: false,
      response: "",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    token_info: {
      length: token.length,
      preview: `${token.substring(0, 5)}...${token.substring(-3)}`,
      has_secret_key: !!secretKey,
    },
    test_results: results,
    working_methods: results.filter((r) => r.success),
    recommendations: generateRecommendations(results),
  })
}

function generateRecommendations(results: TokenTestResult[]): string[] {
  const recommendations: string[] = []
  const workingMethods = results.filter((r) => r.success)

  if (workingMethods.length === 0) {
    recommendations.push("❌ Nenhum método de autenticação funcionou")
    recommendations.push("🔑 Verifique se o token está correto")
    recommendations.push("📞 Entre em contato com o suporte da TryploPay")
    recommendations.push("📚 Consulte a documentação da API")
  } else {
    recommendations.push(`✅ ${workingMethods.length} método(s) funcionando`)
    workingMethods.forEach((method) => {
      recommendations.push(`✓ Use: ${method.method}`)
    })
  }

  return recommendations
}

export async function POST() {
  // Teste de criação de fatura com diferentes métodos
  const testPayload = {
    client: {
      name: "Cliente Teste TryploPay",
      document: "12345678901",
      email: "teste@tryplopay.com",
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
    },
    payment: {
      product_type: 1,
      external_id: `TESTE_${Date.now()}`,
      type: 1,
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      installments: 1,
      products: [
        {
          id: "1",
          title: "Teste de Integração",
          qnt: 1,
          amount: 100, // R$ 1,00
        },
      ],
    },
    shipping: {
      amount: 0,
    },
  }

  const token = process.env.TRYPLOPAY_TOKEN
  const apiUrl = process.env.TRYPLOPAY_API_URL
  const secretKey = process.env.TRYPLOPAY_SECRET_KEY

  if (!token || !apiUrl) {
    return NextResponse.json({
      error: "Configuração incompleta",
      token_exists: !!token,
      api_url_exists: !!apiUrl,
    })
  }

  const results: TokenTestResult[] = []

  // Testar criação com Bearer Token
  try {
    const response = await fetch(`${apiUrl}/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(testPayload),
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw: responseText }
    }

    results.push({
      method: "POST Bearer Token",
      headers: { Authorization: `Bearer ${token.substring(0, 10)}...` },
      status: response.status,
      success: response.ok,
      response: parsedResponse,
    })
  } catch (error) {
    results.push({
      method: "POST Bearer Token",
      headers: { Authorization: `Bearer ${token.substring(0, 10)}...` },
      status: 0,
      success: false,
      response: "",
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    test_payload: testPayload,
    results,
    success: results.some((r) => r.success),
  })
}
