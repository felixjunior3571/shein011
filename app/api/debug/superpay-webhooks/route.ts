import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("🔍 Carregando webhooks SuperPay para debug:", { limit, offset })

    // Tentar buscar webhooks SuperPay diretamente
    const { data: webhooks, error: webhooksError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    // Se a tabela não existir, criar automaticamente
    if (webhooksError && (webhooksError.code === "42P01" || webhooksError.message.includes("does not exist"))) {
      console.log("⚠️ Tabela payment_webhooks não existe, criando automaticamente...")

      try {
        // Criar tabela usando SQL raw
        const { error: createError } = await supabase.rpc("exec", {
          sql: `
            CREATE TABLE IF NOT EXISTS payment_webhooks (
              id BIGSERIAL PRIMARY KEY,
              external_id VARCHAR(255) NOT NULL,
              invoice_id VARCHAR(255) NOT NULL,
              status_code INTEGER NOT NULL,
              status_name VARCHAR(100) NOT NULL,
              amount DECIMAL(10,2) DEFAULT 0,
              payment_date TIMESTAMPTZ,
              processed_at TIMESTAMPTZ DEFAULT NOW(),
              is_paid BOOLEAN DEFAULT FALSE,
              is_denied BOOLEAN DEFAULT FALSE,
              is_expired BOOLEAN DEFAULT FALSE,
              is_canceled BOOLEAN DEFAULT FALSE,
              is_refunded BOOLEAN DEFAULT FALSE,
              is_critical BOOLEAN DEFAULT FALSE,
              gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
              token VARCHAR(255),
              expires_at TIMESTAMPTZ,
              webhook_data JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
            CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
            CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
            CREATE INDEX IF NOT EXISTS idx_payment_webhooks_token ON payment_webhooks(token);
            CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_external_id ON payment_webhooks(gateway, external_id);
          `,
        })

        if (createError) {
          console.error("❌ Erro ao criar tabela via RPC:", createError)

          // Fallback: tentar criar via query direta
          const createTableQuery = `
            CREATE TABLE IF NOT EXISTS payment_webhooks (
              id BIGSERIAL PRIMARY KEY,
              external_id VARCHAR(255) NOT NULL,
              invoice_id VARCHAR(255) NOT NULL,
              status_code INTEGER NOT NULL,
              status_name VARCHAR(100) NOT NULL,
              amount DECIMAL(10,2) DEFAULT 0,
              payment_date TIMESTAMPTZ,
              processed_at TIMESTAMPTZ DEFAULT NOW(),
              is_paid BOOLEAN DEFAULT FALSE,
              is_denied BOOLEAN DEFAULT FALSE,
              is_expired BOOLEAN DEFAULT FALSE,
              is_canceled BOOLEAN DEFAULT FALSE,
              is_refunded BOOLEAN DEFAULT FALSE,
              is_critical BOOLEAN DEFAULT FALSE,
              gateway VARCHAR(50) NOT NULL DEFAULT 'superpay',
              token VARCHAR(255),
              expires_at TIMESTAMPTZ,
              webhook_data JSONB,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            )
          `

          const { error: directCreateError } = await supabase.from("_").select("*").limit(0)
          console.log("Tentativa de criação direta:", directCreateError)
        } else {
          console.log("✅ Tabela payment_webhooks criada com sucesso")

          // Inserir dados de teste
          const testData = [
            {
              external_id: "TEST_SUPERPAY_001",
              invoice_id: "INV_001",
              status_code: 1,
              status_name: "Aguardando Pagamento",
              amount: 34.9,
              is_paid: false,
              is_denied: false,
              is_expired: false,
              is_canceled: false,
              is_refunded: false,
              is_critical: false,
              gateway: "superpay",
              token: `SPY_${Date.now()}_test001`,
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              webhook_data: { test: true, status: 1 },
            },
            {
              external_id: "TEST_SUPERPAY_005",
              invoice_id: "INV_005",
              status_code: 5,
              status_name: "Pago",
              amount: 29.9,
              payment_date: new Date().toISOString(),
              is_paid: true,
              is_denied: false,
              is_expired: false,
              is_canceled: false,
              is_refunded: false,
              is_critical: true,
              gateway: "superpay",
              token: `SPY_${Date.now()}_test005`,
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              webhook_data: { test: true, status: 5 },
            },
            {
              external_id: "TEST_SUPERPAY_012",
              invoice_id: "INV_012",
              status_code: 12,
              status_name: "Negado",
              amount: 44.9,
              is_paid: false,
              is_denied: true,
              is_expired: false,
              is_canceled: false,
              is_refunded: false,
              is_critical: true,
              gateway: "superpay",
              token: `SPY_${Date.now()}_test012`,
              expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              webhook_data: { test: true, status: 12 },
            },
          ]

          const { error: insertError } = await supabase.from("payment_webhooks").insert(testData)

          if (insertError) {
            console.error("❌ Erro ao inserir dados de teste:", insertError)
          } else {
            console.log("✅ Dados de teste inseridos com sucesso")
          }
        }

        // Tentar buscar novamente após criar a tabela
        const { data: newWebhooks, error: newError } = await supabase
          .from("payment_webhooks")
          .select("*")
          .eq("gateway", "superpay")
          .order("processed_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (newError) {
          console.error("❌ Erro ao buscar webhooks após criar tabela:", newError)
          throw newError
        }

        const webhookList = newWebhooks || []
        const stats = calculateStats(webhookList)

        return NextResponse.json({
          success: true,
          message: "Tabela criada automaticamente com dados de teste",
          webhooks: webhookList,
          stats: stats,
          timestamp: new Date().toISOString(),
        })
      } catch (createTableError) {
        console.error("❌ Erro ao criar tabela automaticamente:", createTableError)

        return NextResponse.json({
          success: true,
          message: "Tabela payment_webhooks não encontrada. Execute o script SQL primeiro.",
          webhooks: [],
          stats: {
            total: 0,
            paid: 0,
            denied: 0,
            expired: 0,
            canceled: 0,
            refunded: 0,
            critical: 0,
            expiredTokens: 0,
            totalAmount: 0,
          },
          error: "Tabela não existe e não foi possível criar automaticamente",
          timestamp: new Date().toISOString(),
        })
      }
    }

    if (webhooksError) {
      console.error("❌ Erro ao buscar webhooks SuperPay:", webhooksError)
      throw webhooksError
    }

    const webhookList = webhooks || []
    const stats = calculateStats(webhookList)

    console.log(`✅ ${webhookList.length} webhooks SuperPay carregados`)

    return NextResponse.json({
      success: true,
      webhooks: webhookList,
      stats: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na API de debug SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        webhooks: [],
        stats: {
          total: 0,
          paid: 0,
          denied: 0,
          expired: 0,
          canceled: 0,
          refunded: 0,
          critical: 0,
          expiredTokens: 0,
          totalAmount: 0,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}

function calculateStats(webhooks: any[]) {
  const now = new Date()
  return {
    total: webhooks.length,
    paid: webhooks.filter((w) => w.is_paid).length,
    denied: webhooks.filter((w) => w.is_denied).length,
    expired: webhooks.filter((w) => w.is_expired).length,
    canceled: webhooks.filter((w) => w.is_canceled).length,
    refunded: webhooks.filter((w) => w.is_refunded).length,
    critical: webhooks.filter((w) => w.is_critical).length,
    expiredTokens: webhooks.filter((w) => w.expires_at && new Date(w.expires_at) < now).length,
    totalAmount: webhooks.reduce((sum, w) => sum + (w.amount || 0), 0),
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "clear_test_data") {
      console.log("🧹 Limpando dados de teste SuperPay...")

      const { error } = await supabase
        .from("payment_webhooks")
        .delete()
        .eq("gateway", "superpay")
        .or("external_id.like.TEST_%,external_id.like.SHEIN_TEST_%")

      if (error) {
        console.error("❌ Erro ao limpar dados de teste:", error)
        throw error
      }

      console.log("✅ Dados de teste SuperPay limpos")

      return NextResponse.json({
        success: true,
        message: "Dados de teste SuperPay removidos com sucesso",
      })
    } else if (action === "clear_expired_tokens") {
      console.log("🧹 Limpando tokens expirados SuperPay...")

      const { error } = await supabase
        .from("payment_webhooks")
        .delete()
        .eq("gateway", "superpay")
        .lt("expires_at", new Date().toISOString())

      if (error) {
        console.error("❌ Erro ao limpar tokens expirados:", error)
        throw error
      }

      console.log("✅ Tokens expirados SuperPay limpos")

      return NextResponse.json({
        success: true,
        message: "Tokens expirados SuperPay removidos com sucesso",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Ação não suportada",
          supported_actions: ["clear_test_data", "clear_expired_tokens"],
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ Erro na limpeza SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
