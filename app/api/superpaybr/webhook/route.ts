import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento completo de status SuperPayBR
const STATUS_MAP = {
  1: {
    name: "pending",
    title: "Aguardando Pagamento",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  2: {
    name: "processing",
    title: "Em Processamento",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  3: {
    name: "scheduled",
    title: "Pagamento Agendado",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  4: {
    name: "authorized",
    title: "Autorizado",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  5: {
    name: "paid",
    title: "Pagamento Confirmado",
    critical: true,
    paid: true,
    denied: false,
    expired: false,
    canceled: false,
  }, // ✅ PAGO
  6: {
    name: "canceled",
    title: "Cancelado",
    critical: true,
    paid: false,
    denied: false,
    expired: false,
    canceled: true,
  },
  7: {
    name: "refund_pending",
    title: "Aguardando Estorno",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  8: {
    name: "partially_refunded",
    title: "Parcialmente Estornado",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  9: {
    name: "refunded",
    title: "Estornado",
    critical: true,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  10: {
    name: "disputed",
    title: "Contestado",
    critical: false,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
  },
  12: {
    name: "denied",
    title: "Pagamento Negado",
    critical: true,
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
  }, // ❌ NEGADO
  15: {
    name: "expired",
    title: "Pagamento Vencido",
    critical: true,
    paid: false,
    denied: false,
    expired: true,
    canceled: false,
  }, // ⏰ VENCIDO
  16: {
    name: "error",
    title: "Erro no Pagamento",
    critical: true,
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
  },
} as const

// Função para garantir que a tabela existe
async function ensureTableExists() {
  try {
    // Tentar uma consulta simples para verificar se a tabela existe
    const { error } = await supabase.from("payment_webhooks").select("id").limit(1)

    if (error && error.code === "42P01") {
      console.log("⚠️ Tabela payment_webhooks não existe, criando...")

      // Criar tabela usando SQL raw
      const { error: createError } = await supabase.rpc("exec", {
        sql: `
          CREATE TABLE IF NOT EXISTS payment_webhooks (
            id BIGSERIAL PRIMARY KEY,
            external_id TEXT NOT NULL,
            invoice_id TEXT,
            status_code INTEGER NOT NULL,
            status_name TEXT NOT NULL,
            status_title TEXT,
            amount DECIMAL(10,2) DEFAULT 0,
            payment_date TIMESTAMPTZ,
            webhook_data JSONB,
            processed_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            is_paid BOOLEAN DEFAULT FALSE,
            is_denied BOOLEAN DEFAULT FALSE,
            is_expired BOOLEAN DEFAULT FALSE,
            is_canceled BOOLEAN DEFAULT FALSE,
            is_critical BOOLEAN DEFAULT FALSE,
            gateway TEXT DEFAULT 'superpaybr',
            token TEXT,
            expires_at TIMESTAMPTZ,
            UNIQUE(external_id, gateway)
          );
          
          CREATE INDEX IF NOT EXISTS idx_payment_webhooks_external_id ON payment_webhooks(external_id);
          CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway ON payment_webhooks(gateway);
          CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status_code ON payment_webhooks(status_code);
          CREATE INDEX IF NOT EXISTS idx_payment_webhooks_is_paid ON payment_webhooks(is_paid);
        `,
      })

      if (createError) {
        console.error("❌ Erro ao criar tabela:", createError)
        return false
      }

      console.log("✅ Tabela payment_webhooks criada com sucesso")
    }

    return true
  } catch (error) {
    console.error("❌ Erro ao verificar/criar tabela:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Parse do body do webhook
    const body = await request.json()
    console.log("📦 Dados do webhook SuperPayBR:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook SuperPayBR
    if (!body.event || !body.invoices) {
      console.error("❌ Estrutura de webhook SuperPayBR inválida")
      return NextResponse.json(
        {
          success: false,
          error: "Estrutura de webhook inválida",
          message: "Webhook deve conter 'event' e 'invoices'",
        },
        { status: 400 },
      )
    }

    // Garantir que a tabela existe
    const tableExists = await ensureTableExists()
    if (!tableExists) {
      console.error("❌ Não foi possível criar/acessar tabela payment_webhooks")
      return NextResponse.json(
        {
          success: false,
          error: "Erro de banco de dados",
          message: "Não foi possível acessar a tabela payment_webhooks",
        },
        { status: 500 },
      )
    }

    // Extrair dados do webhook
    const { event, invoices } = body
    const invoice = invoices

    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const amount = invoice.prices?.total || 0
    const paymentDate = invoice.payment?.payDate
    const qrCode = invoice.payment?.details?.qrcode

    console.log("🎯 Informações extraídas SuperPayBR:", {
      event_type: event.type,
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_title: statusTitle,
      amount: amount,
      payment_date: paymentDate,
      has_qr_code: !!qrCode,
    })

    // Obter informações do status
    const statusInfo = STATUS_MAP[statusCode as keyof typeof STATUS_MAP]
    if (!statusInfo) {
      console.error(`❌ Status code SuperPayBR desconhecido: ${statusCode}`)
      // Continuar processamento mesmo com status desconhecido
      const unknownStatusInfo = {
        name: "unknown",
        title: `Status ${statusCode}`,
        critical: false,
        paid: false,
        denied: false,
        expired: false,
        canceled: false,
      }

      const webhookRecord = {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: statusCode,
        status_name: unknownStatusInfo.name,
        status_title: unknownStatusInfo.title,
        amount: Number.parseFloat(amount.toString()) || 0,
        payment_date: paymentDate ? new Date(paymentDate).toISOString() : null,
        webhook_data: body,
        processed_at: new Date().toISOString(),
        is_paid: false,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_critical: false,
        gateway: "superpaybr",
        token: `SPY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }

      await supabase.from("payment_webhooks").upsert(webhookRecord, {
        onConflict: "external_id,gateway",
      })

      return NextResponse.json({ success: true, status: "processed", message: "Status desconhecido processado" })
    }

    // Gerar token único
    const token = `SPY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    console.log(
      `${statusInfo.critical ? "🚨" : "ℹ️"} Status ${statusCode} (${statusInfo.title}) é ${statusInfo.critical ? "CRÍTICO" : "informativo"}`,
    )

    // Preparar dados para salvar
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      status_title: statusInfo.title,
      amount: Number.parseFloat(amount.toString()) || 0,
      payment_date: statusInfo.paid && paymentDate ? new Date(paymentDate).toISOString() : null,
      webhook_data: body,
      processed_at: new Date().toISOString(),
      is_paid: statusInfo.paid,
      is_denied: statusInfo.denied,
      is_expired: statusInfo.expired,
      is_canceled: statusInfo.canceled,
      is_critical: statusInfo.critical,
      gateway: "superpaybr",
      token: token,
      expires_at: expiresAt.toISOString(),
    }

    console.log("💾 Salvando webhook SuperPayBR:", {
      external_id: webhookRecord.external_id,
      status_code: webhookRecord.status_code,
      status_title: webhookRecord.status_title,
      is_critical: webhookRecord.is_critical,
      is_paid: webhookRecord.is_paid,
      amount: webhookRecord.amount,
    })

    // Salvar no banco usando upsert para evitar duplicatas
    const { error: dbError } = await supabase.from("payment_webhooks").upsert(webhookRecord, {
      onConflict: "external_id,gateway",
    })

    if (dbError) {
      console.error("❌ Erro ao salvar webhook SuperPayBR:", dbError)
      throw dbError
    }

    console.log("✅ Webhook SuperPayBR salvo com sucesso!")

    // Log específico para status críticos
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`🆔 External ID: ${externalId}`)
      console.log(`🔑 Token: ${token}`)
      console.log(`📅 Data: ${paymentDate}`)

      // Notificar sistema de monitoramento (via localStorage simulation)
      console.log("📢 Notificando sistema de monitoramento...")
    } else if (statusCode === 12) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🆔 External ID: ${externalId}`)
    } else if (statusCode === 15) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🆔 External ID: ${externalId}`)
    } else if (statusCode === 6) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🆔 External ID: ${externalId}`)
    } else if (statusCode === 9) {
      console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🆔 External ID: ${externalId}`)
    }

    // Retornar resposta de sucesso
    const response = {
      success: true,
      status: "processed",
      message: "Webhook SuperPayBR processado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: statusCode,
        status_name: statusInfo.name,
        status_title: statusInfo.title,
        amount: amount,
        is_critical: statusInfo.critical,
        is_paid: statusInfo.paid,
        processed_at: new Date().toISOString(),
        token: token,
        expires_at: expiresAt.toISOString(),
      },
    }

    console.log("✅ Resposta do webhook SuperPayBR:", response)
    console.log("🏁 Processamento SuperPayBR concluído!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NO WEBHOOK SUPERPAYBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    ) // Retornar 200 para não causar retry no SuperPayBR
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR endpoint ativo",
      gateway: "superpaybr",
      timestamp: new Date().toISOString(),
      status_map: Object.keys(STATUS_MAP).map((code) => ({
        code: Number.parseInt(code),
        ...STATUS_MAP[code as keyof typeof STATUS_MAP],
      })),
    })
  } catch (error) {
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
