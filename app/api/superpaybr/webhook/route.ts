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
      description?: string
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
    const statusDescription = invoices.status.description || ""
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

    // ✅ LÓGICA PRINCIPAL: Verificar se status.code === 5 (Pagamento Confirmado!)
    const isPaid = statusCode === 5
    const isDenied = statusCode === 12
    const isExpired = statusCode === 15
    const isCanceled = statusCode === 6
    const isRefunded = statusCode === 9

    // Preparar dados para localStorage (SISTEMA IDÊNTICO TRYPLOPAY)
    const paymentData = {
      externalId,
      invoiceId,
      amount,
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

    // Salvar no Supabase para persistência
    try {
      const { error: supabaseError } = await supabase.from("payment_webhooks").upsert(
        {
          external_id: externalId,
          invoice_id: invoiceId,
          provider: "superpaybr",
          status_code: statusCode,
          status_name: statusTitle,
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

    // Log do resultado conforme especificação
    if (isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`📅 Data: ${paymentDate}`)
      console.log(`🏦 Gateway: ${paymentGateway}`)
      console.log(`💳 Tipo: ${paymentType}`)
      console.log(`🔗 External ID: ${externalId}`)
      console.log(`📋 Invoice ID: ${invoiceId}`)
      console.log(`🎫 Token: ${token}`)

      // ✅ AQUI: Atualizar o pedido como "pago"
      // ✅ AQUI: Salvar payDate, token, invoice_id, url, etc
      // ✅ AQUI: Redirecionar lead para a próxima etapa do funil
      // ✅ AQUI: (Opcional) Notificar via Discord, e-mail, etc
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
      console.log(`💰 Valor estornado: R$ ${amount}`)
    } else {
      console.log(`ℹ️ Status atualizado SuperPayBR: ${statusTitle} (código ${statusCode})`)
      console.log(`🔗 External ID: ${externalId}`)
    }

    // Resposta do webhook
    const response = NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      external_id: externalId,
      status_code: statusCode,
      status_title: statusTitle,
      is_paid: isPaid,
      webhook_data: paymentData,
    })

    // Headers para notificar o frontend
    response.headers.set("X-Payment-Status", statusTitle)
    response.headers.set("X-External-ID", externalId)
    response.headers.set("X-Is-Paid", isPaid.toString())
    response.headers.set("X-Provider", "superpaybr")
    response.headers.set("X-Status-Code", statusCode.toString())

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

// Método GET para teste do endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPayBR endpoint ativo",
    timestamp: new Date().toISOString(),
    provider: "superpaybr",
    webhook_url: `${request.nextUrl.origin}/api/superpaybr/webhook`,
  })
}
