import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Mapear status codes SuperPayBR para status padrão
function mapSuperPayStatus(statusCode: number): string {
  const statusMap: Record<number, string> = {
    1: "pending", // Aguardando Pagamento
    2: "processing", // Em Processamento
    3: "scheduled", // Pagamento Agendado
    4: "authorized", // Autorizado
    5: "paid", // Pago ✅
    6: "canceled", // Cancelado
    7: "refund_pending", // Aguardando Estorno
    8: "partially_refunded", // Parcialmente Estornado
    9: "refunded", // Estornado
    10: "disputed", // Contestado/Em Contestação
    12: "denied", // Pagamento Negado ❌
    15: "expired", // Pagamento Vencido ⏰
    16: "error", // Erro no Pagamento
  }

  return statusMap[statusCode] || "unknown"
}

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    console.log("=== WEBHOOK SUPERPAYBR RECEBIDO ===")
    console.log("Dados do webhook:", JSON.stringify(webhookData, null, 2))

    // Extrair dados do webhook SuperPayBR
    const event = webhookData.event
    const invoice = webhookData.invoices

    if (!event || !invoice) {
      console.log("❌ Webhook SuperPayBR inválido - dados ausentes")
      return NextResponse.json({ success: false, error: "Dados do webhook inválidos" }, { status: 400 })
    }

    // Mapear dados do webhook
    const mappedWebhook = {
      event_type: event.type || "invoice.update",
      event_date: event.date,
      invoice_id: invoice.id,
      external_id: invoice.external_id,
      token: invoice.token,
      status_code: invoice.status?.code,
      status_title: invoice.status?.title,
      status_description: invoice.status?.description,
      status: mapSuperPayStatus(invoice.status?.code || 1),
      amount: invoice.prices?.total,
      discount: invoice.prices?.discount || 0,
      customer_id: invoice.customer,
      payment_type: invoice.type,
      payment_gateway: invoice.payment?.gateway,
      payment_date: invoice.payment?.payDate,
      payment_due: invoice.payment?.due,
      payment_id: invoice.payment?.payId,
      qr_code: invoice.payment?.details?.qrcode,
      pix_code: invoice.payment?.details?.pix_code,
      payment_url: invoice.payment?.details?.url,
      raw_data: webhookData,
      created_at: new Date().toISOString(),
    }

    console.log("📋 Webhook mapeado:", JSON.stringify(mappedWebhook, null, 2))

    // Salvar no Supabase
    try {
      const { data, error } = await supabase.from("payment_webhooks").insert([mappedWebhook]).select()

      if (error) {
        console.log("❌ Erro ao salvar webhook no Supabase:", error)
      } else {
        console.log("✅ Webhook SuperPayBR salvo no Supabase:", data)
      }
    } catch (supabaseError) {
      console.log("❌ Erro de conexão com Supabase:", supabaseError)
    }

    // Log do status para debug
    if (mappedWebhook.status === "paid") {
      console.log("🎉 PAGAMENTO CONFIRMADO SuperPayBR!")
      console.log("💰 Valor:", mappedWebhook.amount)
      console.log("🆔 External ID:", mappedWebhook.external_id)
    } else if (mappedWebhook.status === "denied") {
      console.log("❌ PAGAMENTO NEGADO SuperPayBR!")
      console.log("🆔 External ID:", mappedWebhook.external_id)
    } else if (mappedWebhook.status === "expired") {
      console.log("⏰ PAGAMENTO VENCIDO SuperPayBR!")
      console.log("🆔 External ID:", mappedWebhook.external_id)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      data: mappedWebhook,
    })
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

// Método OPTIONS para validação de webhook SuperPayBR
export async function OPTIONS(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body.token

    if (!token) {
      return NextResponse.json({ success: false, error: "Token não fornecido" }, { status: 400 })
    }

    console.log("🔍 Validando webhook SuperPayBR com token:", token)

    // Obter token de autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json({ success: false, error: "Erro na autenticação" }, { status: 401 })
    }

    const accessToken = authResult.data.access_token

    // Validar webhook na SuperPayBR
    const validationResponse = await fetch("https://api.superpaybr.com/webhooks", {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    })

    if (validationResponse.ok) {
      console.log("✅ Webhook SuperPayBR válido")
      return NextResponse.json({ success: true })
    } else {
      console.log("❌ Webhook SuperPayBR inválido")
      return NextResponse.json({ success: false }, { status: 404 })
    }
  } catch (error) {
    console.log("❌ Erro na validação do webhook SuperPayBR:", error)
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 })
  }
}
