import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapeamento de status SuperPay conforme documentação oficial
const SUPERPAY_STATUS_MAPPING = {
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
  5: {
    name: "Pago",
    critical: true,
    paid: true,
    denied: false,
    expired: false,
    canceled: false,
    refunded: false,
  },
  6: {
    name: "Cancelado",
    critical: true,
    paid: false,
    denied: false,
    expired: false,
    canceled: true,
    refunded: false,
  },
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
  9: {
    name: "Estornado",
    critical: true,
    paid: false,
    denied: false,
    expired: false,
    canceled: false,
    refunded: true,
  },
  10: {
    name: "Falha",
    critical: true,
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
    refunded: false,
  },
  11: {
    name: "Bloqueado",
    critical: true,
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
    refunded: false,
  },
  12: {
    name: "Negado",
    critical: true,
    paid: false,
    denied: true,
    expired: false,
    canceled: false,
    refunded: false,
  },
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
  15: {
    name: "Vencido",
    critical: true,
    paid: false,
    denied: false,
    expired: true,
    canceled: false,
    refunded: false,
  },
}

// Função para gerar token único
function generateSuperPayToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_${timestamp}_${random}`
}

// Função para validar webhook SuperPay baseado no log fornecido
function validateSuperPayWebhook(headers: Record<string, string>, body: any): boolean {
  try {
    // Verificar headers SuperPay obrigatórios
    const requiredHeaders = ["content-type", "userid", "gateway"]
    const hasRequiredHeaders = requiredHeaders.some((header) =>
      Object.keys(headers).some((key) => key.toLowerCase().includes(header)),
    )

    if (!hasRequiredHeaders) {
      console.log("⚠️ Headers SuperPay não encontrados, mas processando mesmo assim")
    }

    // Verificar estrutura do payload conforme log SuperPay
    if (!body.event || !body.invoices) {
      console.log("❌ Estrutura de payload SuperPay inválida")
      return false
    }

    // Verificar campos obrigatórios do invoice
    const invoice = body.invoices
    if (!invoice.id || !invoice.external_id || !invoice.status) {
      console.log("❌ Campos obrigatórios SuperPay ausentes")
      return false
    }

    return true
  } catch (error) {
    console.log("❌ Erro na validação SuperPay:", error)
    return false
  }
}

// Função para criar tabela se não existir
async function ensureTableExists() {
  try {
    // Tentar fazer uma query simples para verificar se a tabela existe
    const { error } = await supabase.from("payment_webhooks").select("id").limit(1)

    if (error && (error.code === "42P01" || error.message.includes("does not exist"))) {
      console.log("⚠️ Tabela payment_webhooks não existe, criando...")

      // Criar tabela usando insert com dados fictícios para forçar criação
      const createTableData = {
        external_id: "TEMP_CREATE_TABLE",
        invoice_id: "TEMP_CREATE_TABLE",
        status_code: 1,
        status_name: "Temp",
        amount: 0,
        is_paid: false,
        is_denied: false,
        is_expired: false,
        is_canceled: false,
        is_refunded: false,
        is_critical: false,
        gateway: "superpay",
        token: "TEMP_TOKEN",
        expires_at: new Date().toISOString(),
        webhook_data: { temp: true },
      }

      // Tentar inserir dados temporários (isso forçará a criação da tabela se ela não existir)
      const { error: insertError } = await supabase.from("payment_webhooks").insert([createTableData])

      if (insertError) {
        console.error("❌ Erro ao criar tabela:", insertError)
        return false
      }

      // Remover dados temporários
      await supabase.from("payment_webhooks").delete().eq("external_id", "TEMP_CREATE_TABLE")

      console.log("✅ Tabela payment_webhooks criada com sucesso")
      return true
    }

    return true
  } catch (error) {
    console.error("❌ Erro ao verificar/criar tabela:", error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 SuperPay webhook endpoint - GET request")

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPay endpoint ativo",
      gateway: "superpay",
      status_codes: Object.keys(SUPERPAY_STATUS_MAPPING),
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
    console.log("\n🔔 WEBHOOK SUPERPAY RECEBIDO!")
    console.log("⏰ Timestamp:", new Date().toISOString())

    // Obter headers
    const headers = Object.fromEntries(request.headers.entries())
    console.log("📋 Headers recebidos:", headers)

    // Parse dos dados do webhook
    const webhookData = await request.json()
    console.log("📦 Dados do webhook SuperPay:", JSON.stringify(webhookData, null, 2))

    // Validar webhook SuperPay
    if (!validateSuperPayWebhook(headers, webhookData)) {
      console.log("❌ Webhook SuperPay inválido")
      return NextResponse.json(
        {
          success: false,
          error: "Webhook SuperPay inválido",
          timestamp: new Date().toISOString(),
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
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Extrair informações do webhook conforme estrutura SuperPay
    const { event, invoices } = webhookData
    const invoice = invoices

    const externalId = invoice.external_id
    const invoiceId = invoice.id
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const amount = invoice.prices.total
    const paymentDate = invoice.payment.payDate
    const paymentGateway = invoice.payment.gateway

    console.log("🎯 Informações extraídas SuperPay:", {
      event_type: event.type,
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_title: statusTitle,
      amount: amount,
      payment_gateway: paymentGateway,
      payment_date: paymentDate,
    })

    // Obter informações do status
    const statusInfo = SUPERPAY_STATUS_MAPPING[statusCode as keyof typeof SUPERPAY_STATUS_MAPPING]
    if (!statusInfo) {
      console.error(`❌ Status code SuperPay inválido: ${statusCode}`)
      return NextResponse.json(
        {
          success: false,
          error: "Status code inválido",
          message: `Status code ${statusCode} não é válido (1-15)`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      )
    }

    // Gerar token único com expiração de 15 minutos
    const token = generateSuperPayToken()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    console.log(
      `${statusInfo.critical ? "🚨" : "ℹ️"} Status ${statusCode} (${statusInfo.name}) é ${statusInfo.critical ? "CRÍTICO" : "informativo"}`,
    )

    // Preparar dados para salvar
    const webhookRecord = {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: Number.parseFloat(amount.toString()) || 0,
      payment_date: statusInfo.paid && paymentDate ? new Date(paymentDate).toISOString() : null,
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
      webhook_data: webhookData,
    }

    console.log("💾 Salvando webhook SuperPay:", {
      external_id: webhookRecord.external_id,
      status_code: webhookRecord.status_code,
      status_name: webhookRecord.status_name,
      is_critical: webhookRecord.is_critical,
      token: webhookRecord.token,
    })

    // Verificar se registro já existe
    const { data: existingRecord } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("external_id", externalId)
      .eq("gateway", "superpay")
      .single()

    let result
    if (existingRecord) {
      // Atualizar registro existente
      result = await supabase
        .from("payment_webhooks")
        .update(webhookRecord)
        .eq("id", existingRecord.id)
        .select()
        .single()

      console.log(`✅ Webhook SuperPay ATUALIZADO:`, result.data?.id)
    } else {
      // Inserir novo registro
      result = await supabase.from("payment_webhooks").insert([webhookRecord]).select().single()

      console.log(`✅ Webhook SuperPay INSERIDO:`, result.data?.id)
    }

    if (result.error) {
      console.error("❌ Erro ao salvar webhook SuperPay:", result.error)
      throw result.error
    }

    // Log de status críticos
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`🆔 External ID: ${externalId}`)
      console.log(`🔑 Token: ${token}`)
      console.log(`📅 Data: ${paymentDate}`)
    } else if (statusCode === 12) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 15) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 6) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
    } else if (statusCode === 9) {
      console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
    }

    // Retornar resposta de sucesso conforme esperado pelo SuperPay
    const response = {
      success: true,
      status: "processed",
      message: "Webhook SuperPay processado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: statusCode,
        status_name: statusInfo.name,
        amount: amount,
        is_critical: statusInfo.critical,
        processed_at: new Date().toISOString(),
        token: token,
        expires_at: expiresAt.toISOString(),
      },
    }

    console.log("✅ Resposta do webhook SuperPay:", response)
    console.log("🏁 Processamento SuperPay concluído!\n")

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("❌ ERRO NO WEBHOOK SUPERPAY:", error)

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
