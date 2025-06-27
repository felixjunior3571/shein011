import { NextResponse } from "next/server"

export async function GET() {
  // Estrutura básica de resposta
  const response = {
    timestamp: new Date().toISOString(),
    status: "starting",
    environment: {},
    config: {},
    tests: [],
    errors: [],
    warnings: [],
    debug: {},
  }

  try {
    // Passo 1: Verificar ambiente
    response.status = "checking_environment"
    response.environment = {
      NODE_ENV: process.env.NODE_ENV || "unknown",
      VERCEL_ENV: process.env.VERCEL_ENV || "unknown",
      runtime: typeof window === "undefined" ? "server" : "client",
    }

    // Passo 2: Verificar configuração
    response.status = "checking_config"
    response.config = {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        value: process.env.TRYPLOPAY_TOKEN || "undefined",
      },
      TRYPLOPAY_API_URL: {
        exists: !!process.env.TRYPLOPAY_API_URL,
        value: process.env.TRYPLOPAY_API_URL || "undefined",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        value: process.env.TRYPLOPAY_SECRET_KEY || "undefined",
      },
      TRYPLOPAY_WEBHOOK_URL: {
        exists: !!process.env.TRYPLOPAY_WEBHOOK_URL,
        value: process.env.TRYPLOPAY_WEBHOOK_URL || "undefined",
      },
    }

    // Teste 1: Variáveis de ambiente
    response.status = "testing_env_vars"
    if (!process.env.TRYPLOPAY_TOKEN) {
      response.tests.push({
        name: "TRYPLOPAY_TOKEN",
        status: "❌ MISSING",
        message: "Token não configurado",
      })
      response.errors.push("TRYPLOPAY_TOKEN não está definido")
    } else {
      response.tests.push({
        name: "TRYPLOPAY_TOKEN",
        status: "✅ OK",
        message: `Token configurado (${process.env.TRYPLOPAY_TOKEN.length} chars)`,
      })
    }

    if (!process.env.TRYPLOPAY_API_URL) {
      response.tests.push({
        name: "TRYPLOPAY_API_URL",
        status: "❌ MISSING",
        message: "URL da API não configurada",
      })
      response.errors.push("TRYPLOPAY_API_URL não está definido")
    } else {
      response.tests.push({
        name: "TRYPLOPAY_API_URL",
        status: "✅ OK",
        message: `URL configurada: ${process.env.TRYPLOPAY_API_URL}`,
      })
    }

    // Se variáveis críticas não existem, parar aqui
    if (!process.env.TRYPLOPAY_TOKEN || !process.env.TRYPLOPAY_API_URL) {
      response.status = "missing_critical_vars"
      response.summary = {
        overall: "❌ CONFIGURAÇÃO INCOMPLETA",
        message: "Configure TRYPLOPAY_TOKEN e TRYPLOPAY_API_URL",
        next_steps: [
          "1. Acesse o Vercel Dashboard",
          "2. Vá em Settings > Environment Variables",
          "3. Adicione TRYPLOPAY_TOKEN=WmCVLneePWrUMgJ",
          "4. Adicione TRYPLOPAY_API_URL=https://api.tryplopay.com",
          "5. Faça um novo deploy",
        ],
      }
      return NextResponse.json(response, { status: 200 })
    }

    // Teste 2: Validar URL
    response.status = "validating_url"
    try {
      const apiUrl = new URL(process.env.TRYPLOPAY_API_URL)
      response.tests.push({
        name: "URL_VALIDATION",
        status: "✅ OK",
        message: `URL válida: ${apiUrl.protocol}//${apiUrl.host}`,
        details: {
          protocol: apiUrl.protocol,
          host: apiUrl.host,
          pathname: apiUrl.pathname,
        },
      })
    } catch (urlError) {
      response.tests.push({
        name: "URL_VALIDATION",
        status: "❌ INVALID",
        message: "URL da API é inválida",
        error: urlError instanceof Error ? urlError.message : String(urlError),
      })
      response.errors.push(`URL inválida: ${urlError}`)
    }

    // Teste 3: Conectividade básica
    response.status = "testing_connectivity"
    const testUrl = `${process.env.TRYPLOPAY_API_URL}/invoices`

    try {
      // Criar AbortController para timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, 8000) // 8 segundos

      const fetchResponse = await fetch(testUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${process.env.TRYPLOPAY_TOKEN}`,
          "User-Agent": "SHEIN-Test/1.0",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Informações da resposta
      const responseInfo = {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        ok: fetchResponse.ok,
        headers: {},
        url: testUrl,
      }

      // Capturar headers importantes
      const importantHeaders = ["content-type", "server", "date", "content-length"]
      importantHeaders.forEach((header) => {
        const value = fetchResponse.headers.get(header)
        if (value) {
          responseInfo.headers[header] = value
        }
      })

      response.debug.fetch_response = responseInfo

      // Determinar status do teste
      let testStatus = "❌ FAILED"
      let testMessage = `HTTP ${fetchResponse.status}`

      if (fetchResponse.ok) {
        testStatus = "✅ SUCCESS"
        testMessage = `Conectado com sucesso (${fetchResponse.status})`
      } else if (fetchResponse.status === 401) {
        testStatus = "🔑 AUTH_ERROR"
        testMessage = "Erro de autenticação - verifique o token"
      } else if (fetchResponse.status === 404) {
        testStatus = "🔍 NOT_FOUND"
        testMessage = "Endpoint não encontrado - verifique a URL"
      } else if (fetchResponse.status >= 500) {
        testStatus = "🔥 SERVER_ERROR"
        testMessage = "Erro do servidor TryploPay"
      }

      response.tests.push({
        name: "API_CONNECTIVITY",
        status: testStatus,
        message: testMessage,
        details: responseInfo,
      })

      // Teste 4: Verificar conteúdo da resposta
      response.status = "checking_response_content"
      try {
        const responseText = await fetchResponse.text()
        response.debug.response_preview = responseText.substring(0, 300)

        if (responseText.includes("<!DOCTYPE") || responseText.includes("<html")) {
          response.tests.push({
            name: "RESPONSE_FORMAT",
            status: "❌ HTML_ERROR",
            message: "API retornou HTML (possível erro 404/500)",
            details: {
              content_type: fetchResponse.headers.get("content-type"),
              preview: responseText.substring(0, 100),
            },
          })
          response.errors.push("API retornou HTML ao invés de JSON")
        } else if (responseText.trim() === "") {
          response.tests.push({
            name: "RESPONSE_FORMAT",
            status: "⚠️ EMPTY",
            message: "Resposta vazia",
          })
          response.warnings.push("Resposta vazia da API")
        } else {
          try {
            const jsonData = JSON.parse(responseText)
            response.tests.push({
              name: "RESPONSE_FORMAT",
              status: "✅ JSON_OK",
              message: "Resposta JSON válida",
              details: {
                type: typeof jsonData,
                keys: Array.isArray(jsonData) ? "array" : Object.keys(jsonData || {}),
              },
            })
          } catch (parseError) {
            response.tests.push({
              name: "RESPONSE_FORMAT",
              status: "⚠️ INVALID_JSON",
              message: "Resposta não é JSON válido",
              details: {
                parse_error: parseError instanceof Error ? parseError.message : String(parseError),
                preview: responseText.substring(0, 100),
              },
            })
            response.warnings.push("Resposta não é JSON válido")
          }
        }
      } catch (textError) {
        response.tests.push({
          name: "RESPONSE_READING",
          status: "❌ READ_ERROR",
          message: "Erro ao ler resposta",
          error: textError instanceof Error ? textError.message : String(textError),
        })
        response.errors.push(`Erro ao ler resposta: ${textError}`)
      }
    } catch (fetchError) {
      let errorType = "UNKNOWN_ERROR"
      let errorMessage = "Erro desconhecido"

      if (fetchError instanceof Error) {
        if (fetchError.name === "AbortError") {
          errorType = "TIMEOUT"
          errorMessage = "Timeout na conexão (8 segundos)"
        } else if (fetchError.message.includes("ENOTFOUND")) {
          errorType = "DNS_ERROR"
          errorMessage = "Erro de DNS - domínio não encontrado"
        } else if (fetchError.message.includes("ECONNREFUSED")) {
          errorType = "CONNECTION_REFUSED"
          errorMessage = "Conexão recusada"
        } else if (fetchError.message.includes("certificate")) {
          errorType = "SSL_ERROR"
          errorMessage = "Erro de certificado SSL"
        } else {
          errorMessage = fetchError.message
        }
      }

      response.tests.push({
        name: "API_CONNECTIVITY",
        status: "❌ CONNECTION_FAILED",
        message: errorMessage,
        error_type: errorType,
        details: {
          url: testUrl,
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        },
      })
      response.errors.push(`Erro de conectividade: ${errorMessage}`)
    }

    // Resumo final
    response.status = "completed"
    const successTests = response.tests.filter((t) => t.status.includes("✅")).length
    const failedTests = response.tests.filter((t) => t.status.includes("❌")).length
    const warningTests = response.tests.filter((t) => t.status.includes("⚠️")).length

    response.summary = {
      total_tests: response.tests.length,
      success: successTests,
      failed: failedTests,
      warnings: warningTests,
      overall:
        failedTests === 0
          ? warningTests === 0
            ? "✅ TODOS OS TESTES PASSARAM"
            : "⚠️ ALGUNS AVISOS"
          : "❌ ALGUNS TESTES FALHARAM",
      ready_for_production: failedTests === 0 && response.errors.length === 0,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (globalError) {
    // Capturar qualquer erro não tratado
    response.status = "global_error"
    response.global_error = {
      message: globalError instanceof Error ? globalError.message : String(globalError),
      name: globalError instanceof Error ? globalError.name : "UnknownError",
      stack: globalError instanceof Error ? globalError.stack : undefined,
    }
    response.errors.push(`Erro global: ${response.global_error.message}`)

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST() {
  try {
    return NextResponse.json(
      {
        message: "Endpoint POST para testes de criação de fatura",
        status: "not_implemented",
        timestamp: new Date().toISOString(),
        note: "Use GET para testes de conectividade",
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erro no endpoint POST",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
