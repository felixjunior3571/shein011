import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Testando conexão SuperPayBR...")

    // Verificar variáveis de ambiente
    const requiredEnvVars = ["SUPERPAYBR_TOKEN", "SUPERPAYBR_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Variáveis de ambiente faltando",
        message: `Variáveis não configuradas: ${missingVars.join(", ")}`,
        missing_vars: missingVars,
      })
    }

    // URLs possíveis da API SuperPayBR
    const possibleUrls = [
      "https://api.superpaybr.com",
      "https://superpaybr.com/api",
      "https://api.superpay.com.br",
      "https://superpay.com.br/api",
    ]

    const testResults = []

    // Testar diferentes configurações
    for (const baseUrl of possibleUrls) {
      try {
        console.log(`🔍 Testando URL: ${baseUrl}`)

        const testConfigs = [
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.SUPERPAYBR_TOKEN}`,
              "Content-Type": "application/json",
            },
          },
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${Buffer.from(`${process.env.SUPERPAYBR_TOKEN}:${process.env.SUPERPAYBR_SECRET_KEY}`).toString("base64")}`,
              "Content-Type": "application/json",
            },
          },
          {
            method: "GET",
            headers: {
              "X-API-Key": process.env.SUPERPAYBR_TOKEN,
              "X-Secret-Key": process.env.SUPERPAYBR_SECRET_KEY,
              "Content-Type": "application/json",
            },
          },
        ]

        for (const config of testConfigs) {
          try {
            const response = await fetch(`${baseUrl}/ping`, {
              ...config,
              signal: AbortSignal.timeout(5000), // 5 segundos timeout
            })

            const result = {
              url: baseUrl,
              method: config.method,
              status: response.status,
              headers: Object.fromEntries(Object.entries(config.headers)),
              success: response.ok,
              response_text: await response.text().catch(() => "Unable to read response"),
            }

            testResults.push(result)

            if (response.ok) {
              console.log(`✅ Conexão bem-sucedida: ${baseUrl}`)
              return NextResponse.json({
                success: true,
                message: "Conexão SuperPayBR estabelecida com sucesso",
                working_config: result,
                all_results: testResults,
              })
            }
          } catch (fetchError) {
            testResults.push({
              url: baseUrl,
              method: config.method,
              error: fetchError instanceof Error ? fetchError.message : "Unknown fetch error",
              success: false,
            })
          }
        }
      } catch (urlError) {
        testResults.push({
          url: baseUrl,
          error: urlError instanceof Error ? urlError.message : "Unknown URL error",
          success: false,
        })
      }
    }

    // Se chegou até aqui, nenhuma configuração funcionou
    console.log("❌ Nenhuma configuração SuperPayBR funcionou")

    return NextResponse.json({
      success: false,
      error: "Não foi possível conectar com SuperPayBR",
      message: "Todas as configurações testadas falharam",
      all_results: testResults,
      suggestions: [
        "Verifique se as credenciais estão corretas",
        "Confirme a URL base da API SuperPayBR",
        "Verifique se o IP está liberado no painel SuperPayBR",
        "Confirme se a conta está ativa",
      ],
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
