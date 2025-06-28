import { type NextRequest, NextResponse } from "next/server"
import { savePaymentConfirmation, type TryploPayWebhookPayload, STATUS_CODES } from "@/lib/payment-storage"

export async function POST(request: NextRequest) {
  try {
    console.log("🚨🚨🚨 WEBHOOK TRYPLOPAY RECEBIDO 🚨🚨🚨")

    // Validar headers obrigatórios
    const gateway = request.headers.get("gateway")
    const contentType = request.headers.get("content-type")

    console.log("📋 Headers recebidos:")
    console.log(`- Gateway: ${gateway}`)
    console.log(`- Content-Type: ${contentType}`)
    console.log(`- User-Agent: ${request.headers.get("user-agent")}`)
    console.log(`- Webhook Header: ${request.headers.get("webhook")}`)

    // Validação crítica do gateway
    if (gateway !== "TRYPLOPAY") {
      console.log("❌ ERRO: Gateway inválido:", gateway)
      return NextResponse.json(
        {
          success: false,
          error: "Gateway inválido",
          received_gateway: gateway,
        },
        { status: 400 },
      )
    }

    // Processar payload
    const payload: TryploPayWebhookPayload = await request.json()

    console.log("📦 Payload completo recebido:")
    console.log(JSON.stringify(payload, null, 2))

    // Validar estrutura do payload
    if (!payload.event || !payload.invoices) {
      console.log("❌ ERRO: Estrutura do payload inválida")
      return NextResponse.json(
        {
          success: false,
          error: "Estrutura do payload inválida",
        },
        { status: 400 },
      )
    }

    const { event, invoices } = payload

    // Extrair dados críticos
    const statusCode = invoices.status.code
    const externalId = invoices.external_id
    const invoiceId = invoices.id
    const token = invoices.token
    const amount = invoices.prices.total
    const paymentDate = invoices.payment?.payDate || null

    // Validar status code
    const statusInfo = STATUS_CODES[statusCode as keyof typeof STATUS_CODES]
    if (!statusInfo) {
      console.log(`❌ ERRO: Status code inválido: ${statusCode}`)
      return NextResponse.json(
        {
          success: false,
          error: "Status code inválido",
          received_status: statusCode,
        },
        { status: 400 },
      )
    }

    // Logs detalhados obrigatórios
    console.log("🔍 DADOS EXTRAÍDOS:")
    console.log(`- Status Code: ${statusCode}`)
    console.log(`- External ID: ${externalId}`)
    console.log(`- Invoice ID: ${invoiceId}`)
    console.log(`- Token: ${token}`)
    console.log(`- Valor: R$ ${amount.toFixed(2)}`)
    console.log(`- Status: ${statusInfo.name}`)
    console.log(`- Data Pagamento: ${paymentDate}`)
    console.log(`- Evento: ${event.type}`)
    console.log(`- Data Evento: ${event.date}`)

    // Verificar status críticos
    if (statusInfo.isPaid) {
      console.log("🎉🎉🎉 PAGAMENTO APROVADO! 🎉🎉🎉")
    } else if (statusInfo.isCanceled) {
      console.log("🚫🚫🚫 PAGAMENTO CANCELADO! 🚫🚫🚫")
    } else if (statusInfo.isDenied) {
      console.log("❌❌❌ PAGAMENTO NEGADO! ❌❌❌")
    } else if (statusInfo.isRefunded) {
      console.log("🔄🔄🔄 PAGAMENTO ESTORNADO! 🔄🔄🔄")
    } else if (statusInfo.isExpired) {
      console.log("⏰⏰⏰ PAGAMENTO VENCIDO! ⏰⏰⏰")
    }

    // Salvar confirmação em memória global
    const confirmationData = savePaymentConfirmation(externalId, invoiceId.toString(), token, {
      statusCode,
      amount,
      paymentDate,
      statusDescription: invoices.status.description,
      gateway: invoices.payment?.gateway,
      payId: invoices.payment?.payId,
      pixCode: invoices.payment?.details?.pix_code,
      qrCode: invoices.payment?.details?.qrcode,
      rawPayload: payload,
    })

    console.log("💾 Confirmação salva com sucesso:")
    console.log(`- Chaves criadas: ${externalId}, ${invoiceId}${token ? `, token_${token}` : ""}`)
    console.log(`- isPaid: ${confirmationData.isPaid}`)
    console.log(`- isCanceled: ${confirmationData.isCanceled}`)
    console.log(`- isDenied: ${confirmationData.isDenied}`)
    console.log(`- isRefunded: ${confirmationData.isRefunded}`)
    console.log(`- isExpired: ${confirmationData.isExpired}`)

    // Resposta estruturada para TryploPay
    const response = {
      success: true,
      message: "Webhook processado com sucesso",
      processed_at: new Date().toISOString(),
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status_code: statusCode,
        status_name: statusInfo.name,
        amount: amount,
        is_paid: statusInfo.isPaid,
        is_canceled: statusInfo.isCanceled,
        is_denied: statusInfo.isDenied,
        is_refunded: statusInfo.isRefunded,
        is_expired: statusInfo.isExpired,
      },
    }

    console.log("✅ Resposta enviada para TryploPay:")
    console.log(JSON.stringify(response, null, 2))
    console.log("🚨🚨🚨 FIM DO PROCESSAMENTO WEBHOOK 🚨🚨🚨")

    return NextResponse.json(response)
  } catch (error) {
    console.log("❌❌❌ ERRO CRÍTICO NO WEBHOOK ❌❌❌")
    console.error("Erro completo:", error)
    console.log("❌❌❌ FIM DO ERRO ❌❌❌")

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function OPTIONS() {
  // Método OPTIONS para validação conforme documentação TryploPay
  console.log("🔍 Requisição OPTIONS recebida para validação")

  return NextResponse.json(
    { success: true, message: "Webhook endpoint ativo" },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Gateway, Webhook",
      },
    },
  )
}
