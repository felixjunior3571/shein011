import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória
const globalPaymentStorage = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPayBR recebido")

    const body = await request.json()
    console.log("📋 Dados do webhook:", JSON.stringify(body, null, 2))

    // Processar dados do webhook SuperPayBR
    const webhookData = processSuperpaybrWebhook(body)

    if (webhookData) {
      console.log("✅ Webhook processado:", webhookData)

      // Armazenar em memória global
      globalPaymentStorage.set(webhookData.external_id, {
        ...webhookData,
        timestamp: new Date().toISOString(),
        source: "webhook",
      })

      console.log(`💾 Dados armazenados para: ${webhookData.external_id}`)

      // Backup no Supabase
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

        await supabase.from("superpaybr_webhooks").insert({
          external_id: webhookData.external_id,
          status_code: webhookData.status_code,
          status_name: webhookData.status_name,
          amount: webhookData.amount,
          payment_date: webhookData.payment_date,
          webhook_data: body,
          processed_at: new Date().toISOString(),
        })

        console.log("💾 Backup salvo no Supabase")
      } catch (supabaseError) {
        console.error("⚠️ Erro ao salvar no Supabase:", supabaseError)
      }

      return NextResponse.json({
        success: true,
        message: "Webhook processado com sucesso",
        external_id: webhookData.external_id,
        status: webhookData.status_name,
      })
    } else {
      console.log("⚠️ Webhook não pôde ser processado")
      return NextResponse.json({
        success: false,
        error: "Formato de webhook não reconhecido",
      })
    }
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)
    return NextResponse.json({
      success: false,
      error: "Erro interno no webhook",
    })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const externalId = searchParams.get("external_id")

  if (!externalId) {
    return NextResponse.json({
      success: false,
      error: "external_id é obrigatório",
    })
  }

  const data = globalPaymentStorage.get(externalId)

  if (data) {
    return NextResponse.json({
      success: true,
      data,
    })
  } else {
    return NextResponse.json({
      success: false,
      error: "Dados não encontrados",
    })
  }
}

function processSuperpaybrWebhook(body: any): any {
  console.log("🔍 Processando webhook SuperPayBR...")

  try {
    // Estrutura do webhook SuperPayBR: { event: {...}, invoices: {...} }
    if (body.invoices) {
      const invoice = body.invoices
      console.log("📄 Processando invoice:", invoice)

      return {
        external_id: invoice.external_id,
        invoice_id: invoice.id,
        status_code: invoice.status?.code || 1,
        status_name: mapStatusCode(invoice.status?.code || 1),
        status_text: invoice.status?.text || "pending",
        amount: invoice.prices?.total || 0,
        payment_date: invoice.payment?.payDate || null,
        payment_method: invoice.type || "PIX",
        customer_id: invoice.customer,
        is_paid: invoice.status?.code === 5,
        is_denied: invoice.status?.code === 3,
        is_expired: invoice.status?.code === 4,
        is_canceled: invoice.status?.code === 6,
        is_refunded: invoice.status?.code === 7,
      }
    }

    // Estrutura alternativa
    if (body.data?.invoice) {
      const invoice = body.data.invoice
      return {
        external_id: invoice.external_id,
        invoice_id: invoice.id,
        status_code: invoice.status?.code || 1,
        status_name: mapStatusCode(invoice.status?.code || 1),
        amount: invoice.amount || 0,
        payment_date: invoice.payment_date || null,
        is_paid: invoice.status?.code === 5,
      }
    }

    console.log("⚠️ Estrutura de webhook não reconhecida")
    return null
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error)
    return null
  }
}

function mapStatusCode(code: number): string {
  const statusMap: { [key: number]: string } = {
    1: "pending",
    2: "processing",
    3: "denied",
    4: "expired",
    5: "approved",
    6: "canceled",
    7: "refunded",
    8: "chargeback",
  }

  return statusMap[code] || "unknown"
}
