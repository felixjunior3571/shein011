import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Interface para webhook SuperPayBR conforme documentação
interface SuperPayBRWebhookData {
  event: {
    type: string
    date: string
  }
  invoices: {
    id: string
    external_id: string
    token: string
    date: string
    status: {
      code: number
      title: string
      description: string
    }
    customer: string
    prices: {
      total: number
      discount: number
      taxs: {
        others: any
      }
      refound: any
    }
    type: string
    payment: {
      gateway: string
      date: string | null
      due: string
      card: any
      payId: string
      payDate: string
      details: {
        barcode: string | null
        pix_code: string
        qrcode: string
        url: string
      }
    }
  }
}

// Mapeamento de status SuperPayBR conforme documentação
const STATUS_MAP: Record<number, string> = {
  1: "pending", // Aguardando Pagamento
  2: "processing", // Em Processamento
  3: "scheduled", // Pagamento Agendado
  4: "authorized", // Autorizado
  5: "paid", // ✅ PAGO - Pagamento Confirmado!
  6: "canceled", // Cancelado
  7: "refund_pending", // Aguardando Estorno
  8: "partially_refunded", // Parcialmente Estornado
  9: "refunded", // Estornado
  10: "disputed", // Contestado/Em Contestação
  12: "denied", // ❌ PAGAMENTO NEGADO
  15: "expired", // ⏰ PAGAMENTO VENCIDO
  16: "error", // Erro no Pagamento
}

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 WEBHOOK SUPERPAYBR RECEBIDO!")

    // Obter dados do webhook
    const webhookData: SuperPayBRWebhookData = await request.json()
    console.log("📋 Dados do webhook SuperPayBR:", JSON.stringify(webhookData, null, 2))

    const { event, invoices } = webhookData

    // Validar se é um evento de atualização de fatura
    if (event.type !== "invoice.update") {
      console.log("⚠️ Evento ignorado:", event.type)
      return NextResponse.json({ success: true, message: "Evento ignorado" })
    }

    const externalId = invoices.external_id
    const statusCode = invoices.status.code
    const statusTitle = invoices.status.title
    const statusDescription = invoices.status.description
    const amount = invoices.prices.total
    const paymentDate = invoices.payment.payDate
    const paymentGateway = invoices.payment.gateway
    const paymentType = invoices.type
    const invoiceId = invoices.id
    const token = invoices.token

    console.log(`🎯 Processando pagamento SuperPayBR:`, {
      external_id: externalId,
      invoice_id: invoiceId,
      status_code: statusCode,
      status_title: statusTitle,
      amount,
      payment_date: paymentDate,
      payment_gateway: paymentGateway,
      payment_type: paymentType,
    })

    // Mapear status da SuperPayBR
    const mappedStatus = STATUS_MAP[statusCode] || "unknown"
    const isPaid = statusCode === 5 // Pagamento Confirmado!
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9

    // Preparar dados para localStorage (IDÊNTICO AO SISTEMA TRYPLOPAY)
    const paymentData = {
      externalId,
      invoiceId,
      amount,
      status: mappedStatus,
      statusCode,
      statusName: statusTitle,
      statusDescription,
      paymentDate,
      paymentGateway,
      paymentType,
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      token,
      provider: "superpaybr",
      processedAt: new Date().toISOString(),
      rawData: webhookData,
    }

    // SALVAR NO LOCALSTORAGE (SISTEMA IDÊNTICO TRYPLOPAY)
    try {
      // Salvar com a chave padrão para monitoramento
      const webhookKey = `webhook_payment_${externalId}`

      // Simular localStorage no servidor via broadcast/event
      const localStorageData = JSON.stringify(paymentData)

      console.log(`💾 Salvando dados do webhook SuperPayBR:`, {
        key: webhookKey,
        data: paymentData,
      })

      // Aqui normalmente salvaria no localStorage, mas no servidor vamos usar Supabase
      // O frontend vai buscar esses dados via polling ou webhook
    } catch (storageError) {
      console.log("⚠️ Erro ao simular localStorage:", storageError)
    }

    // Salvar no Supabase para persistência (BACKUP)
    try {
      const { error: supabaseError } = await supabase.from("payment_webhooks").upsert(
        {
          external_id: externalId,
          invoice_id: invoiceId,
          provider: "superpaybr",
          status_code: statusCode,
          status_name: mappedStatus,
          status_title: statusTitle,
          status_description: statusDescription,
          amount,
          payment_date: paymentDate,
          payment_gateway: paymentGateway,
          payment_type: paymentType,
          is_paid: isPaid,
          is_denied: isDenied,
          is_refunded: isRefunded,
          is_expired: isExpired,
          is_canceled: isCanceled,
          webhook_token: token,
          raw_data: webhookData,
          processed_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )

      if (supabaseError) {
        console.log("⚠️ Erro ao salvar no Supabase:", supabaseError)
      } else {
        console.log("💾 Webhook SuperPayBR salvo no Supabase com sucesso!")
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro no Supabase:", supabaseError)
    }

    // Log do resultado (IDÊNTICO AO SISTEMA TRYPLOPAY)
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`)
      console.log(`📅 Data: ${paymentDate}`)
      console.log(`🏦 Gateway: ${paymentGateway}`)
      console.log(`💳 Tipo: ${paymentType}`)
      console.log(`🔗 External ID: ${externalId}`)
    } else if (isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
      console.log(`❌ Motivo: ${statusDescription}`)
    } else if (isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
    } else if (isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
    } else if (isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`🔗 External ID: ${externalId}`)
      console.log(`💰 Valor estornado: R$ ${(amount / 100).toFixed(2)}`)
    } else {
      console.log(`ℹ️ Status atualizado SuperPayBR: ${statusTitle} (${mappedStatus})`)
      console.log(`🔗 External ID: ${externalId}`)
    }

    // Resposta do webhook (IDÊNTICA AO SISTEMA TRYPLOPAY)
    const response = NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      external_id: externalId,
      status: mappedStatus,
      is_paid: isPaid,
      webhook_data: paymentData,
    })

    // Headers para notificar o frontend
    response.headers.set("X-Payment-Status", mappedStatus)
    response.headers.set("X-External-ID", externalId)
    response.headers.set("X-Is-Paid", isPaid.toString())
    response.headers.set("X-Provider", "superpaybr")

    return response
  } catch (error) {
    console.log("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar webhook SuperPayBR",
      },
      { status: 500 },
    )
  }
}

// Método OPTIONS para validação do webhook SuperPayBR conforme documentação
export async function OPTIONS(request: NextRequest) {
  try {
    console.log("=== VALIDAÇÃO WEBHOOK SUPERPAYBR ===")

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 400 })
    }

    console.log("🔍 Validando token SuperPayBR:", token)

    // Decodificar token base64 conforme documentação SuperPayBR
    let decodedToken = ""
    try {
      decodedToken = Buffer.from(token, "base64").toString("utf-8")
      console.log("🔓 Token decodificado:", decodedToken)

      // Extrair nosso token (após os dois pontos)
      const [userId, ourToken] = decodedToken.split(":")
      console.log("👤 User ID:", userId)
      console.log("🔑 Nosso token:", ourToken)

      if (!ourToken) {
        throw new Error("Token inválido - formato incorreto")
      }
    } catch (decodeError) {
      console.log("❌ Erro ao decodificar token:", decodeError)
      return NextResponse.json({ error: "Token inválido" }, { status: 404 })
    }

    // Fazer autenticação para validar
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
      method: "POST",
    })
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json({ error: "Falha na autenticação" }, { status: 401 })
    }

    const accessToken = authResult.data.access_token

    // Validar token com SuperPayBR conforme documentação
    const validateResponse = await fetch("https://api.superpaybr.com/webhooks", {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: decodedToken.split(":")[1] }), // Enviar apenas nosso token
    })

    if (validateResponse.ok) {
      console.log("✅ Token SuperPayBR válido!")
      return NextResponse.json({ success: true })
    } else {
      console.log("❌ Token SuperPayBR inválido!")
      return NextResponse.json({ error: "Token inválido" }, { status: 404 })
    }
  } catch (error) {
    console.log("❌ Erro na validação do webhook SuperPayBR:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// Método GET para teste do endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPayBR endpoint ativo",
    timestamp: new Date().toISOString(),
    provider: "superpaybr",
  })
}
