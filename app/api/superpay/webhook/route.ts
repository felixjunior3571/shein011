import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPay conforme documentação
const STATUS_MAPPING = {
  1: {
    name: "Aguardando Pagamento",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  2: {
    name: "Em Processamento",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  3: {
    name: "Processando",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  4: {
    name: "Aprovado",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  5: { name: "Pago", critical: true, paid: true, denied: false, expired: false, canceled: false, refunded: false },
  6: { name: "Cancelado", critical: true, paid: false, denied: false, expired: false, canceled: true, refunded: false },
  7: {
    name: "Contestado",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  8: {
    name: "Chargeback",
    critical: true,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  9: { name: "Estornado", critical: true, paid: false, denied: false, expired: false, canceled: false, refunded: true },
  10: { name: "Falha", critical: true, paid: false, denied: false, expired: false, canceled: false, refunded: false },
  11: {
    name: "Bloqueado",
    critical: true,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  12: { name: "Negado", critical: true, paid: false, denied: true, expired: false, canceled: false, refunded: false },
  13: {
    name: "Análise",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  14: {
    name: "Análise Manual",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  15: { name: "Vencido", critical: true, paid: false, denied: false, expired: true, canceled: false, refunded: false },
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 SuperPay webhook endpoint - GET request")

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay endpoint ativo",
      gateway: "superpay",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPay GET:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📥 Webhook SuperPay recebido")

    const body = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook SuperPay
    if (!body.event || !body.invoices) {
      console.error("❌ Estrutura de webhook inválida")
      return NextResponse.json(
        {
          success: false,
          error: "Estrutura de webhook inválida",
          message: "Webhook deve conter 'event' e 'invoices'",
        },
        { status: 400 },
      )
    }

    const { event, invoices } = body
    const invoice = invoices

    // Extrair dados do webhook
    const externalId = invoice.external_id || invoice.externalId
    const invoiceId = invoice.id
    const statusCode = invoice.status?.code || invoice.statusCode
    const paymentDate = invoice.payment?.payDate || invoice.paymentDate

    if (!externalId || !invoiceId || !statusCode) {
      console.error("❌ Dados obrigatórios ausentes no webhook")
      return NextResponse.json(
        {
          success: false,
          error: "Dados obrigatórios ausentes",
          message: "external_id, invoice_id e status_code são obrigatórios",
        },
        { status: 400 },
      )
    }

    // Obter informações do status
    const statusInfo = STATUS_MAPPING[statusCode as keyof typeof STATUS_MAPPING]
    if (!statusInfo) {
      console.error(`❌ Status code inválido: ${statusCode}`)
      return NextResponse.json(
        {
          success: false,
          error: "Status code inválido",
          message: `Status code ${statusCode} não é válido (1-15)`,
        },
        { status: 400 },
      )
    }

    // Gerar token único com expiração de 15 minutos
    const token = `SPY_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    // Verificar se a tabela existe e criar se necessário
    try {
      const { error: tableError } = await supabase.from("payment_webhooks").select("id").limit(1)

      if (tableError && tableError.code === "42P01") {
        console.log("⚠️ Tabela payment_webhooks não existe, criando...")

        // Criar tabela via SQL direto
        const { error: createError } = await supabase.rpc("exec_sql", {
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
          `,
        })

        if (createError) {
          console.error("❌ Erro ao criar tabela:", createError)
        } else {
          console.log("✅ Tabela payment_webhooks criada com sucesso")
        }
      }
    } catch (tableCheckError) {
      console.error("⚠️ Erro ao verificar/criar tabela:", tableCheckError)
    }

    // Inserir ou atualizar webhook
    const webhookData = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: invoice.amount || 0,
      payment_date: paymentDate ? new Date(paymentDate).toISOString() : null,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.paid,
      is_denied: statusInfo.denied,
      is_expired: statusInfo.expired,
      is_canceled: statusInfo.canceled,
      is_refunded: statusInfo.refunded,
      is_critical: statusInfo.critical,
      gateway: "superpay",
      token: token,
      expires_at: expiresAt.toISOString(),
      webhook_data: body,
    }

    const { data, error } = await supabase
      .from("payment_webhooks")
      .upsert(webhookData, {
        onConflict: "external_id,gateway",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ Erro ao salvar webhook:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar webhook",
          message: error.message,
        },
        { status: 200 }, // Retornar 200 para não causar retry no SuperPay
      )
    }

    console.log(`✅ Webhook SuperPay processado: ${externalId} - ${statusInfo.name}`)

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id: externalId,
        status: statusInfo.name,
        critical: statusInfo.critical,
        token: token,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Retornar 200 para não causar retry no SuperPay
    )
  }
}
