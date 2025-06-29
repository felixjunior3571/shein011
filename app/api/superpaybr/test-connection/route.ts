import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("🧪 === TESTE DE CONEXÃO SUPERPAYBR ===")

    const results = {
      environment: {
        apiUrl: process.env.SUPERPAYBR_API_URL || "❌ NÃO DEFINIDA",
        token: process.env.SUPERPAYBR_TOKEN ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
        secretKey: process.env.SUPERPAYBR_SECRET_KEY ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
        webhookUrl: process.env.SUPERPAYBR_WEBHOOK_URL || "❌ NÃO DEFINIDA",
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ DEFINIDA" : "❌ NÃO DEFINIDA",
      },
      tests: {
        auth: { status: "pending", message: "" },
        supabase: { status: "pending", message: "" },
        webhook: { status: "pending", message: "" },
      },
    }

    // Teste 1: Autenticação SuperPayBR
    try {
      console.log("🔐 Testando autenticação...")
      const authResponse = await fetch(`${process.env.SUPERPAYBR_API_URL}/v4/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.SUPERPAYBR_SECRET_KEY}`,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
        }),
      })

      if (authResponse.ok) {
        const authData = await authResponse.json()
        results.tests.auth = {
          status: "success",
          message: `✅ Autenticação bem-sucedida - Token: ${authData.access_token?.substring(0, 20)}...`,
        }
      } else {
        const errorText = await authResponse.text()
        results.tests.auth = {
          status: "error",
          message: `❌ Falha na autenticação: ${authResponse.status} - ${errorText}`,
        }
      }
    } catch (error) {
      results.tests.auth = {
        status: "error",
        message: `❌ Erro na autenticação: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      }
    }

    // Teste 2: Conexão Supabase
    try {
      console.log("🗄️ Testando Supabase...")
      const { createClient } = await import("@supabase/supabase-js")

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data, error } = await supabase.from("payments").select("count").limit(1)

      if (error) {
        results.tests.supabase = {
          status: "error",
          message: `❌ Erro Supabase: ${error.message}`,
        }
      } else {
        results.tests.supabase = {
          status: "success",
          message: "✅ Conexão Supabase bem-sucedida",
        }
      }
    } catch (error) {
      results.tests.supabase = {
        status: "error",
        message: `❌ Erro Supabase: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      }
    }

    // Teste 3: Webhook URL
    results.tests.webhook = {
      status: process.env.SUPERPAYBR_WEBHOOK_URL ? "success" : "error",
      message: process.env.SUPERPAYBR_WEBHOOK_URL
        ? `✅ Webhook URL configurada: ${process.env.SUPERPAYBR_WEBHOOK_URL}`
        : "❌ Webhook URL não configurada",
    }

    const allTestsPassed = Object.values(results.tests).every((test) => test.status === "success")

    console.log(`🎯 Resultado geral: ${allTestsPassed ? "✅ TODOS OS TESTES PASSARAM" : "❌ ALGUNS TESTES FALHARAM"}`)

    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? "✅ SuperPayBR configurado corretamente" : "❌ Problemas na configuração SuperPayBR",
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
