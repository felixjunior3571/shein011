import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 TESTANDO CONEXÃO SUPERPAYBR")

    // Verificar variáveis de ambiente
    const requiredEnvVars = [
      "SUPERPAYBR_TOKEN",
      "SUPERPAYBR_SECRET_KEY",
      "SUPERPAY_API_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

    if (missingVars.length > 0) {
      console.error("❌ Variáveis de ambiente ausentes:", missingVars)
      return NextResponse.json(
        {
          success: false,
          error: "Configuração incompleta",
          message: `Variáveis ausentes: ${missingVars.join(", ")}`,
          missing_vars: missingVars,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    console.log("✅ Todas as variáveis de ambiente estão configuradas")

    // Testar autenticação SuperPay
    try {
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
      const authData = await authResponse.json()

      if (!authData.success) {
        throw new Error(`Falha na autenticação: ${authData.error}`)
      }

      console.log("✅ Autenticação SuperPay funcionando")

      // Testar conexão com Supabase
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data, error } = await supabase.from("payment_webhooks").select("count").limit(1)

      if (error && error.code !== "42P01") {
        // 42P01 = tabela não existe (ok, será criada)
        throw new Error(`Erro Supabase: ${error.message}`)
      }

      console.log("✅ Conexão Supabase funcionando")

      return NextResponse.json({
        success: true,
        message: "Conexão SuperPay funcionando perfeitamente",
        data: {
          auth_working: true,
          supabase_working: true,
          webhook_url: "https://v0-copy-shein-website.vercel.app/api/superpaybr/webhook",
          environment_vars: {
            SUPERPAYBR_TOKEN: "✅ Configurado",
            SUPERPAYBR_SECRET_KEY: "✅ Configurado",
            SUPERPAY_API_URL: process.env.SUPERPAY_API_URL,
            SUPABASE_URL: "✅ Configurado",
            SUPABASE_KEY: "✅ Configurado",
          },
          auth_data: {
            access_token_length: authData.data?.access_token?.length || 0,
            expires_in: authData.data?.expires_in || 0,
          },
          supabase_status: error?.code === "42P01" ? "Tabela precisa ser criada" : "Funcionando",
        },
        timestamp: new Date().toISOString(),
      })
    } catch (authError) {
      console.error("❌ Erro na autenticação SuperPay:", authError)

      return NextResponse.json(
        {
          success: false,
          error: "Erro de autenticação SuperPay",
          message: authError instanceof Error ? authError.message : "Erro desconhecido",
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      )
    }
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { test_webhook = false, external_id } = body

    if (test_webhook && external_id) {
      console.log("🧪 Testando webhook SuperPay com external_id:", external_id)

      // Simular webhook de teste
      const simulateResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/simulate-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: external_id,
          status_code: 5,
          amount: 27.97,
        }),
      })

      const simulateResult = await simulateResponse.json()

      return NextResponse.json({
        success: true,
        message: "Teste de webhook executado",
        data: {
          webhook_test: true,
          external_id: external_id,
          simulate_result: simulateResult,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Teste básico de conexão
    const getResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/test-connection`)
    const getResult = await getResponse.json()

    return NextResponse.json({
      success: true,
      message: "Teste de conexão via POST",
      data: getResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Erro no teste via POST",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
