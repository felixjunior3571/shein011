import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 TESTANDO CONEXÕES SUPERPAYBR")

    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      tests: {} as Record<string, any>,
    }

    // 1. Testar variáveis de ambiente SuperPayBR
    console.log("📋 Verificando variáveis de ambiente...")
    results.tests.environment_variables = {
      SUPERPAY_API_URL: !!process.env.SUPERPAY_API_URL,
      SUPERPAY_TOKEN: !!process.env.SUPERPAY_TOKEN,
      SUPERPAY_SECRET_KEY: !!process.env.SUPERPAY_SECRET_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      values: {
        SUPERPAY_API_URL: process.env.SUPERPAY_API_URL || "NOT_SET",
        SUPERPAY_TOKEN: process.env.SUPERPAY_TOKEN ? "SET" : "NOT_SET",
        SUPERPAY_SECRET_KEY: process.env.SUPERPAY_SECRET_KEY ? "SET" : "NOT_SET",
      },
    }

    // 2. Testar autenticação SuperPayBR
    console.log("🔐 Testando autenticação SuperPayBR...")
    try {
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
      const authData = await authResponse.json()

      results.tests.superpaybr_auth = {
        success: authData.success,
        status: authResponse.status,
        has_access_token: !!authData.data?.access_token,
        error: authData.error || null,
      }

      console.log("✅ Autenticação SuperPayBR:", results.tests.superpaybr_auth)
    } catch (error) {
      results.tests.superpaybr_auth = {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
      console.log("❌ Erro na autenticação SuperPayBR:", error)
    }

    // 3. Testar conexão Supabase
    console.log("🗄️ Testando conexão Supabase...")
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      // Testar se a tabela existe
      const { data, error } = await supabase.from("payment_webhooks").select("count").limit(1)

      results.tests.supabase_connection = {
        success: !error,
        table_exists: !error,
        error: error?.message || null,
        connection_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT_SET",
        service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT_SET",
      }

      console.log("✅ Conexão Supabase:", results.tests.supabase_connection)
    } catch (error) {
      results.tests.supabase_connection = {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
      console.log("❌ Erro na conexão Supabase:", error)
    }

    // 4. Testar webhook endpoint
    console.log("🔗 Testando webhook endpoint...")
    try {
      const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
        method: "GET",
      })
      const webhookData = await webhookResponse.json()

      results.tests.webhook_endpoint = {
        success: webhookData.success,
        status: webhookResponse.status,
        active: webhookData.success,
        url: webhookData.webhook_url,
      }

      console.log("✅ Webhook endpoint:", results.tests.webhook_endpoint)
    } catch (error) {
      results.tests.webhook_endpoint = {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
      console.log("❌ Erro no webhook endpoint:", error)
    }

    // 5. Resumo geral
    const allTestsPassed = Object.values(results.tests).every((test: any) => test.success !== false)

    results.summary = {
      all_tests_passed: allTestsPassed,
      total_tests: Object.keys(results.tests).length,
      passed_tests: Object.values(results.tests).filter((test: any) => test.success === true).length,
      status: allTestsPassed ? "✅ SISTEMA PRONTO" : "⚠️ CONFIGURAÇÃO NECESSÁRIA",
    }

    console.log("📊 Resumo dos testes:", results.summary)

    return NextResponse.json(results, {
      status: allTestsPassed ? 200 : 206, // 206 = Partial Content (alguns testes falharam)
    })
  } catch (error) {
    console.error("❌ Erro geral no teste de conexão:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro no teste de conexão",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 TESTE DE WEBHOOK SUPERPAYBR VIA POST")

    const body = await request.json()
    const { test_external_id = `TEST_${Date.now()}`, test_status = 5 } = body

    console.log("📋 Dados do teste:", { test_external_id, test_status })

    // Simular webhook de teste
    const testWebhook = {
      event: {
        type: "invoice.update",
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
      },
      invoices: {
        id: `TEST_${Date.now()}`,
        external_id: test_external_id,
        token: `test-token-${Date.now()}`,
        date: new Date().toISOString().replace("T", " ").substring(0, 19),
        status: {
          code: test_status,
          title: test_status === 5 ? "Pagamento Confirmado!" : "Status de Teste",
          description: "Webhook de teste gerado automaticamente",
          text: test_status === 5 ? "approved" : "test",
        },
        customer: 999999,
        prices: {
          total: 1.0,
          discount: 0,
          taxs: { others: 0 },
          refound: null,
        },
        type: "PIX",
        payment: {
          gateway: "SuperPay",
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
          due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
          card: null,
          payId: null,
          payDate: test_status === 5 ? new Date().toISOString().replace("T", " ").substring(0, 19) : null,
          details: {
            barcode: null,
            pix_code: null,
            qrcode:
              "00020126870014br.gov.bcb.pix2565pix.test.com.br/qr/v3/test5204000053039865401.005802BR5925TEST_WEBHOOK_SUPERPAY6006CANOAS62070503***630405EC",
            url: null,
          },
        },
      },
    }

    // Enviar para o webhook real
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Test-Webhook": "true",
      },
      body: JSON.stringify(testWebhook),
    })

    const webhookResult = await webhookResponse.json()

    console.log("📥 Resultado do teste de webhook:", webhookResult)

    return NextResponse.json({
      success: true,
      message: "Teste de webhook executado",
      test_data: {
        external_id: test_external_id,
        status_code: test_status,
        webhook_sent: testWebhook,
        webhook_response: webhookResult,
        webhook_status: webhookResponse.status,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no teste de webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro no teste de webhook",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
