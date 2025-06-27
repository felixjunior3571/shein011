import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const testResults = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    tryplopay_config: {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...` : "❌ NÃO DEFINIDO",
        value: process.env.TRYPLOPAY_TOKEN || "❌ NÃO DEFINIDO",
      },
      TRYPLOPAY_API_URL: {
        exists: !!process.env.TRYPLOPAY_API_URL,
        value: process.env.TRYPLOPAY_API_URL || "❌ NÃO DEFINIDO",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 10)}...`
          : "❌ NÃO DEFINIDO",
        value: process.env.TRYPLOPAY_SECRET_KEY || "❌ NÃO DEFINIDO",
      },
      TRYPLOPAY_WEBHOOK_URL: {
        exists: !!process.env.TRYPLOPAY_WEBHOOK_URL,
        value: process.env.TRYPLOPAY_WEBHOOK_URL || "❌ NÃO DEFINIDO",
      },
    },
    tests: [],
  }

  // Teste 1: Verificar se as variáveis estão definidas
  if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_API_URL) {
    testResults.tests.push({
      name: "Variáveis de Ambiente",
      status: "❌ FALHOU",
      message: "TRYPLOPAY_TOKEN ou TRYPLOPAY_API_URL não estão definidos",
      required_vars: {
        TRYPLOPAY_TOKEN: !!process.env.TRYPLOPAY_TOKEN,
        TRYPLOPAY_API_URL: !!process.env.TRYPLOPAY_API_URL,
        TRYPLOPAY_SECRET_KEY: !!process.env.TRYPLOPAY_SECRET_KEY,
        TRYPLOPAY_WEBHOOK_URL: !!process.env.TRYPLOPAY_WEBHOOK_URL,
      },
      current_values: {
        TRYPLOPAY_TOKEN: process.env.TRYPLOPAY_TOKEN || "undefined",
        TRYPLOPAY_API_URL: process.env.TRYPLOPAY_API_URL || "undefined",
        TRYPLOPAY_SECRET_KEY: process.env.TRYPLOPAY_SECRET_KEY || "undefined",
        TRYPLOPAY_WEBHOOK_URL: process.env.TRYPLOPAY_WEBHOOK_URL || "undefined",
      },
    })

    return NextResponse.json(testResults, { status: 200 })
  }

  // Teste 2: Testar conectividade com a API
  try {
    const testUrl = `${process.env.TRYPLOPAY_API_URL}/invoices`

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
        "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY || "",
      },
      signal: AbortSignal.timeout(10000), // 10 segundos
    })

    testResults.tests.push({
      name: "Conectividade API",
      status: response.ok ? "✅ SUCESSO" : "⚠️ AVISO",
      message: `HTTP ${response.status} - ${response.statusText}`,
      details: {
        url: testUrl,
        status: response.status,
        headers: Object.fromEntries(response.headers),
      },
    })

    // Teste 3: Verificar estrutura da resposta
    if (response.ok) {
      try {
        const responseText = await response.text()
        const data = JSON.parse(responseText)

        testResults.tests.push({
          name: "Estrutura da Resposta",
          status: "✅ SUCESSO",
          message: "API retornou JSON válido",
          details: {
            response_keys: Object.keys(data),
            response_preview: JSON.stringify(data).substring(0, 200) + "...",
          },
        })
      } catch (parseError) {
        testResults.tests.push({
          name: "Estrutura da Resposta",
          status: "❌ FALHOU",
          message: "API não retornou JSON válido",
          error: parseError instanceof Error ? parseError.message : "Erro desconhecido",
        })
      }
    }
  } catch (fetchError) {
    testResults.tests.push({
      name: "Conectividade API",
      status: "❌ FALHOU",
      message: "Erro de conexão com a API TryploPay",
      error: fetchError instanceof Error ? fetchError.message : "Erro desconhecido",
    })
  }

  // Teste 4: Verificar webhook URL
  if (process.env.TRYPLOPAY_WEBHOOK_URL) {
    try {
      const webhookUrl = new URL(process.env.TRYPLOPAY_WEBHOOK_URL)
      testResults.tests.push({
        name: "Webhook URL",
        status: "✅ SUCESSO",
        message: "URL do webhook é válida",
        details: {
          protocol: webhookUrl.protocol,
          host: webhookUrl.host,
          pathname: webhookUrl.pathname,
        },
      })
    } catch (urlError) {
      testResults.tests.push({
        name: "Webhook URL",
        status: "❌ FALHOU",
        message: "URL do webhook é inválida",
        error: urlError instanceof Error ? urlError.message : "Erro desconhecido",
      })
    }
  }

  return NextResponse.json(testResults, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount = 29.9, customerData } = body

    if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_API_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "Variáveis de ambiente não configuradas",
          missing_vars: {
            TRYPLOPAY_TOKEN: !process.env.TRYPLOPAY_TOKEN,
            TRYPLOPAY_API_URL: !process.env.TRYPLOPAY_API_URL,
          },
        },
        { status: 500 },
      )
    }

    // Teste de criação de fatura real
    const externalId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const payload = {
      client: {
        name: customerData?.name || "Cliente Teste",
        document: "12345678901",
        email: customerData?.email || "teste@shein.com.br",
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
        ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      },
      payment: {
        product_type: 1,
        id: externalId,
        type: 1, // PIX
        due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        referer: externalId,
        installments: "1",
        webhook: process.env.TRYPLOPAY_WEBHOOK_URL,
        products: [
          {
            id: "1",
            title: "Teste - Cartão SHEIN",
            qnt: 1,
            amount: amount.toFixed(2),
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
        "X-Secret-Key": process.env.TRYPLOPAY_SECRET_KEY || "",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Resposta da API não é JSON válido",
          response_preview: responseText.substring(0, 500),
          status: response.status,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: response.ok,
        test_type: "create_invoice",
        status: response.status,
        external_id: externalId,
        response_data: responseData,
        payload_sent: payload,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
