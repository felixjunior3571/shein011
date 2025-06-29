import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 === TESTE DE CONEXÃO SUPERPAYBR ===")

    // 1. Verificar variáveis de ambiente
    const requiredEnvs = {
      SUPERPAYBR_TOKEN: process.env.SUPERPAYBR_TOKEN,
      SUPERPAYBR_SECRET_KEY: process.env.SUPERPAYBR_SECRET_KEY,
      SUPERPAYBR_API_URL: process.env.SUPERPAYBR_API_URL,
      SUPERPAYBR_WEBHOOK_URL: process.env.SUPERPAYBR_WEBHOOK_URL,
    }

    const missingEnvs = Object.entries(requiredEnvs)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingEnvs.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Variáveis de ambiente ausentes",
          missing: missingEnvs,
          step: "environment_check",
        },
        { status: 500 },
      )
    }

    console.log("✅ Variáveis de ambiente configuradas")

    // 2. Testar autenticação
    console.log("🔐 Testando autenticação...")
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na autenticação SuperPayBR",
          details: authResult.error,
          step: "authentication",
        },
        { status: 401 },
      )
    }

    console.log("✅ Autenticação SuperPayBR bem-sucedida")

    // 3. Testar webhook endpoint
    console.log("🔗 Testando endpoint de webhook...")
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`)
    const webhookResult = await webhookResponse.json()

    if (!webhookResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Endpoint de webhook não está funcionando",
          details: webhookResult,
          step: "webhook_endpoint",
        },
        { status: 500 },
      )
    }

    console.log("✅ Endpoint de webhook ativo")

    // 4. Testar conexão com Supabase
    console.log("🗄️ Testando conexão com Supabase...")
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const { data, error } = await supabase.from("payments").select("count").limit(1)

      if (error) {
        throw error
      }

      console.log("✅ Conexão com Supabase funcionando")
    } catch (supabaseError) {
      return NextResponse.json(
        {
          success: false,
          error: "Falha na conexão com Supabase",
          details: supabaseError instanceof Error ? supabaseError.message : "Erro desconhecido",
          step: "supabase_connection",
        },
        { status: 500 },
      )
    }

    // 5. Resultado final
    console.log("🎉 Todos os testes passaram!")

    return NextResponse.json({
      success: true,
      message: "Conexão SuperPayBR funcionando perfeitamente!",
      tests: {
        environment: "✅ Variáveis configuradas",
        authentication: "✅ Autenticação funcionando",
        webhook: "✅ Endpoint ativo",
        database: "✅ Supabase conectado",
      },
      config: {
        api_url: process.env.SUPERPAYBR_API_URL,
        webhook_url: process.env.SUPERPAYBR_WEBHOOK_URL,
        token_configured: !!process.env.SUPERPAYBR_TOKEN,
        secret_configured: !!process.env.SUPERPAYBR_SECRET_KEY,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de conexão SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no teste de conexão",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        step: "general_error",
      },
      { status: 500 },
    )
  }
}
