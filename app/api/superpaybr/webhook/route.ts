import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Inicializar localStorage simulado global se não existir
if (typeof global !== "undefined" && !global.webhookLocalStorage) {
  global.webhookLocalStorage = new Map()
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚨🚨🚨 [SuperPayBR Webhook] WEBHOOK RECEBIDO 🚨🚨🚨")

    const body = await request.json()
    console.log("📦 [SuperPayBR Webhook] Dados recebidos:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    const { id, external_id, status, amount, paid_at, created_at, updated_at, customer, ...otherData } = body

    console.log("🔍 [SuperPayBR Webhook] Dados extraídos:")
    console.log("- ID:", id)
    console.log("- External ID:", external_id)
    console.log("- Status:", status)
    console.log("- Amount:", amount)
    console.log("- Paid At:", paid_at)

    if (!external_id) {
      console.log("⚠️ [SuperPayBR Webhook] External ID não encontrado no webhook")
      return NextResponse.json(
        {
          success: false,
          error: "External ID não encontrado no webhook",
        },
        { status: 400 },
      )
    }

    // Mapear status SuperPayBR
    const statusCode = status?.code || 1
    const statusMap: Record<
      number,
      {
        name: string
        isPaid: boolean
        isDenied: boolean
        isExpired: boolean
        isCanceled: boolean
        isRefunded: boolean
      }
    > = {
      1: {
        name: "Aguardando Pagamento",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      2: {
        name: "Em Processamento",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      3: {
        name: "Pagamento Agendado",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      4: { name: "Autorizado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
      8: {
        name: "Parcialmente Estornado",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: true,
      },
      9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
      12: {
        name: "Pagamento Negado",
        isPaid: false,
        isDenied: true,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      15: {
        name: "Pagamento Vencido",
        isPaid: false,
        isDenied: false,
        isExpired: true,
        isCanceled: false,
        isRefunded: false,
      },
      16: {
        name: "Erro no Pagamento",
        isPaid: false,
        isDenied: true,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
    }

    const statusInfo = statusMap[statusCode] || statusMap[1]

    const webhookData = {
      externalId: external_id,
      invoiceId: id,
      amount: (amount || 0) / 100,
      statusCode,
      statusName: statusInfo.name,
      isPaid: statusInfo.isPaid,
      isDenied: statusInfo.isDenied,
      isExpired: statusInfo.isExpired,
      isCanceled: statusInfo.isCanceled,
      isRefunded: statusInfo.isRefunded,
      paymentDate: paid_at || (statusInfo.isPaid ? new Date().toISOString() : null),
      webhookData: body,
      source: "webhook_superpaybr",
      timestamp: new Date().toISOString(),
    }

    console.log("📊 [SuperPayBR Webhook] Dados processados:", webhookData)

    // Salvar no localStorage simulado global
    try {
      const localStorageKey = `webhook_payment_${external_id}`
      global.webhookLocalStorage = global.webhookLocalStorage || new Map()
      global.webhookLocalStorage.set(localStorageKey, JSON.stringify(webhookData))
      console.log("💾 [SuperPayBR Webhook] Dados salvos no localStorage simulado")
    } catch (storageError) {
      console.log("⚠️ [SuperPayBR Webhook] Erro ao salvar no localStorage:", storageError)
    }

    // Salvar no Supabase
    try {
      const { data: supabaseData, error: supabaseError } = await supabase.from("payment_webhooks").insert({
        external_id,
        invoice_id: id,
        status_code: statusCode,
        status_name: statusInfo.name,
        amount: webhookData.amount,
        is_paid: statusInfo.isPaid,
        is_denied: statusInfo.isDenied,
        is_expired: statusInfo.isExpired,
        is_canceled: statusInfo.isCanceled,
        is_refunded: statusInfo.isRefunded,
        payment_date: paid_at,
        webhook_data: body,
        created_at: new Date().toISOString(),
      })

      if (supabaseError) {
        console.log("⚠️ [SuperPayBR Webhook] Erro ao salvar no Supabase:", supabaseError)
      } else {
        console.log("✅ [SuperPayBR Webhook] Dados salvos no Supabase:", supabaseData)
      }
    } catch (supabaseError) {
      console.log("⚠️ [SuperPayBR Webhook] Erro na conexão com Supabase:", supabaseError)
    }

    // Log do status específico
    if (statusInfo.isPaid) {
      console.log("🎉🎉🎉 [SuperPayBR Webhook] PAGAMENTO CONFIRMADO PELA ADQUIRENTE! 🎉🎉🎉")
      console.log(`💰 Valor: R$ ${webhookData.amount.toFixed(2)}`)
      console.log(`👤 Cliente: ${customer?.name || "N/A"}`)
      console.log(`🆔 External ID: ${external_id}`)
    } else if (statusInfo.isDenied) {
      console.log("❌ [SuperPayBR Webhook] PAGAMENTO NEGADO!")
    } else if (statusInfo.isExpired) {
      console.log("⏰ [SuperPayBR Webhook] PAGAMENTO VENCIDO!")
    } else if (statusInfo.isCanceled) {
      console.log("🚫 [SuperPayBR Webhook] PAGAMENTO CANCELADO!")
    } else if (statusInfo.isRefunded) {
      console.log("🔄 [SuperPayBR Webhook] PAGAMENTO ESTORNADO!")
    } else {
      console.log("⏳ [SuperPayBR Webhook] Status atualizado:", statusInfo.name)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: webhookData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook] Erro ao processar webhook:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    console.log("📊 [SuperPayBR Webhook] Consultando estatísticas...")

    // Estatísticas do localStorage simulado
    const localStorageStats = {
      total: global.webhookLocalStorage?.size || 0,
      keys: global.webhookLocalStorage ? Array.from(global.webhookLocalStorage.keys()) : [],
    }

    // Estatísticas do Supabase
    let supabaseStats = { total: 0, recent: [] }
    try {
      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      if (!error && data) {
        supabaseStats = {
          total: data.length,
          recent: data,
        }
      }
    } catch (supabaseError) {
      console.log("⚠️ [SuperPayBR Webhook] Erro ao consultar Supabase:", supabaseError)
    }

    return NextResponse.json({
      success: true,
      data: {
        localStorage: localStorageStats,
        supabase: supabaseStats,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook] Erro ao consultar estatísticas:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro ao consultar estatísticas",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
