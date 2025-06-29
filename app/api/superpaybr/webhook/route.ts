import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória para acesso rápido
const globalPaymentStorage = new Map<string, any>()

// Cliente Supabase para backup
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados completos do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados da estrutura SuperPayBR
    const invoiceData = body.invoices || body.invoice || body.data

    if (!invoiceData) {
      console.log("❌ Dados da fatura não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 })
    }

    const externalId = invoiceData.external_id
    const statusCode = invoiceData.status?.code
    const statusTitle = invoiceData.status?.title || "Status desconhecido"
    const amount = invoiceData.prices?.total || 0
    const paymentDate = invoiceData.payment?.payDate || invoiceData.payment?.date

    console.log("🔍 Dados extraídos:", {
      external_id: externalId,
      status_code: statusCode,
      status_title: statusTitle,
      amount: amount,
      payment_date: paymentDate,
    })

    if (!externalId) {
      console.log("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID não encontrado" }, { status: 400 })
    }

    // Mapear status SuperPayBR
    const statusMapping: Record<
      number,
      { name: string; isPaid: boolean; isDenied: boolean; isExpired: boolean; isCanceled: boolean; isRefunded: boolean }
    > = {
      1: {
        name: "Aguardando Pagamento",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      2: { name: "Em Análise", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      3: {
        name: "Pago Parcialmente",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      4: { name: "Negado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
      5: {
        name: "Pagamento Confirmado!",
        isPaid: true,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
      7: { name: "Vencido", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
      8: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
    }

    const mappedStatus = statusMapping[statusCode] || statusMapping[1]

    // Dados do pagamento para armazenamento
    const paymentData = {
      external_id: externalId,
      status_code: statusCode,
      status_name: mappedStatus.name,
      is_paid: mappedStatus.isPaid,
      is_denied: mappedStatus.isDenied,
      is_expired: mappedStatus.isExpired,
      is_canceled: mappedStatus.isCanceled,
      is_refunded: mappedStatus.isRefunded,
      amount: amount,
      payment_date: paymentDate,
      webhook_received_at: new Date().toISOString(),
      raw_webhook_data: body,
    }

    console.log("💾 Salvando dados do pagamento:", paymentData)

    // Salvar no armazenamento global (acesso instantâneo)
    globalPaymentStorage.set(externalId, paymentData)
    console.log("✅ Dados salvos no armazenamento global")

    // Backup no Supabase (assíncrono)
    try {
      const { error: supabaseError } = await supabase.from("superpaybr_webhooks").upsert(
        {
          external_id: externalId,
          status_code: statusCode,
          status_name: mappedStatus.name,
          is_paid: mappedStatus.isPaid,
          is_denied: mappedStatus.isDenied,
          is_expired: mappedStatus.isExpired,
          is_canceled: mappedStatus.isCanceled,
          is_refunded: mappedStatus.isRefunded,
          amount: amount,
          payment_date: paymentDate,
          webhook_data: body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "external_id",
        },
      )

      if (supabaseError) {
        console.log("⚠️ Erro ao salvar no Supabase:", supabaseError.message)
      } else {
        console.log("✅ Backup salvo no Supabase")
      }
    } catch (supabaseErr) {
      console.log("⚠️ Erro no backup Supabase:", supabaseErr)
    }

    // Log do status do pagamento
    if (mappedStatus.isPaid) {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR!")
      console.log(`💰 Valor: R$ ${amount}`)
      console.log(`📅 Data: ${paymentDate}`)
    } else if (mappedStatus.isDenied) {
      console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAYBR!")
    } else if (mappedStatus.isExpired) {
      console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAYBR!")
    } else if (mappedStatus.isCanceled) {
      console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAYBR!")
    } else if (mappedStatus.isRefunded) {
      console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAYBR!")
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso")

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      status: mappedStatus.name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "SuperPayBR Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
    stored_payments: globalPaymentStorage.size,
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

// Função para consultar dados do armazenamento global
export function getPaymentFromStorage(externalId: string) {
  return globalPaymentStorage.get(externalId)
}
