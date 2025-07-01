import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🔍 TESTE DE CONEXÃO SUPERPAYBR COMPLETO")

    // 1. Verificar variáveis de ambiente
    const envVars = {
      SUPERPAYBR_TOKEN: process.env.SUPERPAYBR_TOKEN,
      SUPERPAYBR_SECRET_KEY: process.env.SUPERPAYBR_SECRET_KEY,
      SUPERPAY_TOKEN: process.env.SUPERPAY_TOKEN,
      SUPERPAY_SECRET_KEY: process.env.SUPERPAY_SECRET_KEY,
      SUPERPAY_API_URL: process.env.SUPERPAY_API_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    }

    console.log("📋 Variáveis de ambiente:", {
      SUPERPAYBR_TOKEN: !!envVars.SUPERPAYBR_TOKEN,
      SUPERPAYBR_SECRET_KEY: !!envVars.SUPERPAYBR_SECRET_KEY,
      SUPERPAY_TOKEN: !!envVars.SUPERPAY_TOKEN,
      SUPERPAY_SECRET_KEY: !!envVars.SUPERPAY_SECRET_KEY,
      SUPERPAY_API_URL: !!envVars.SUPERPAY_API_URL,
      SUPABASE_URL: !!envVars.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!envVars.SUPABASE_SERVICE_KEY,
    })

    // 2. Tentar usar as credenciais corretas
    const token = envVars.SUPERPAYBR_TOKEN || envVars.SUPERPAY_TOKEN
    const secretKey = envVars.SUPERPAYBR_SECRET_KEY || envVars.SUPERPAY_SECRET_KEY

    if (!token || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Credenciais não encontradas",
          message: "Nenhuma combinação válida de token/secret encontrada",
          available_vars: envVars,
        },
        { status: 500 },
      )
    }

    console.log("🔑 Usando credenciais:", {
      token_preview: token.substring(0, 10) + "...",
      secret_preview: secretKey.substring(0, 20) + "...",
    })

    // 3. Testar diferentes URLs e métodos de autenticação
    const testConfigs = [
      {
        name: "SuperPayBR API v1",
        url: "https://api.superpaybr.com/auth",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${token}:${secretKey}`).toString("base64")}`,
          scope: "invoice.write, customer.write, webhook.write",
        },
      },
      {
        name: "SuperPayBR API v2",
        url: "https://api.superpaybr.com/v2/auth",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          token: token,
          secret: secretKey,
        },
      },
      {
        name: "SuperPay Alternative",
        url: "https://api.superpay.com.br/auth",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Secret-Key": secretKey,
        },
      },
    ]

    const results = []

    for (const config of testConfigs) {
      try {
        console.log(`🌐 Testando: ${config.name} - ${config.url}`)

        const fetchOptions: RequestInit = {
          method: config.method,
          headers: config.headers,
        }

        if (config.body) {
          fetchOptions.body = JSON.stringify(config.body)
        }

        const response = await fetch(config.url, fetchOptions)
        const responseText = await response.text()

        let responseData = null
        try {
          responseData = JSON.parse(responseText)
        } catch {
          responseData = responseText
        }

        const result = {
          name: config.name,
          url: config.url,
          method: config.method,
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          response: responseData,
          headers: Object.fromEntries(response.headers.entries()),
        }

        results.push(result)

        if (response.ok) {
          console.log(`✅ ${config.name} funcionou!`)

          return NextResponse.json({
            success: true,
            message: `Conexão bem-sucedida com ${config.name}`,
            working_config: result,
            all_results: results,
            credentials_used: {
              token_preview: token.substring(0, 10) + "...",
              secret_preview: secretKey.substring(0, 20) + "...",
            },
          })
        } else {
          console.log(`❌ ${config.name} falhou:`, response.status, responseText)
        }
      } catch (error) {
        console.log(`❌ Erro em ${config.name}:`, error)
        results.push({
          name: config.name,
          url: config.url,
          method: config.method,
          error: error instanceof Error ? error.message : "Network error",
        })
      }
    }

    // 4. Se chegou aqui, nenhuma configuração funcionou
    console.log("❌ Nenhuma configuração de API funcionou")

    return NextResponse.json(
      {
        success: false,
        error: "Nenhuma configuração de API funcionou",
        message: "Todas as tentativas de autenticação falharam",
        all_results: results,
        credentials_used: {
          token_preview: token.substring(0, 10) + "...",
          secret_preview: secretKey.substring(0, 20) + "...",
        },
        suggestions: [
          "Verificar se as credenciais estão corretas",
          "Verificar se a API SuperPayBR está funcionando",
          "Verificar se o IP está liberado na SuperPayBR",
          "Tentar usar modo de emergência (PIX manual)",
        ],
      },
      { status: 401 },
    )
  } catch (error) {
    console.error("❌ Erro geral no teste de conexão:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
