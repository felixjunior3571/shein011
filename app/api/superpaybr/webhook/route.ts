import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Payload completo:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    let paymentData = null

    // Estrutura: { invoices: { ... } }
    if (body.invoices) {
      paymentData = body.invoices
      console.log("📋 Dados encontrados em 'invoices'")
    }
    // Estrutura: { data: { ... } }
    else if (body.data) {
      paymentData = body.data
      console.log("📋 Dados encontrados em 'data'")
    }
    // Estrutura direta
    else {
      paymentData = body
      console.log("📋 Usando dados diretos do body")
    }

    if (!paymentData) {
      console.error("❌ Dados de pagamento não encontrados no webhook")
      return NextResponse.json({ success: false, error: "Dados não encontrados" }, { status: 400 })
    }

    // Extrair informações essenciais
    const externalId = paymentData.external_id || paymentData.id || paymentData.payment_id
    const status = paymentData.status || paymentData.payment_status
    const amount = paymentData.amount || paymentData.value || paymentData.total || 0

    console.log("🔍 Dados extraídos:", {
      externalId,
      status,
      amount,
      statusType: typeof status,
    })

    if (!externalId) {
      console.error("❌ External ID não encontrado no webhook")
      return NextResponse.json({ success: false, error: "External ID não encontrado" }, { status: 400 })
    }

    // Mapear status SuperPayBR
    let isPaid = false
    let isDenied = false
    let isExpired = false
    let isCanceled = false
    let isRefunded = false
    let statusName = "Desconhecido"

    // Status SuperPayBR (números)
    if (typeof status === "number") {
      switch (status) {
        case 5: // Pago
          isPaid = true
          statusName = "Pagamento Confirmado!"
          break
        case 3: // Negado
          isDenied = true
          statusName = "Pagamento Negado"
          break
        case 6: // Vencido
          isExpired = true
          statusName = "Pagamento Vencido"
          break
        case 7: // Cancelado
          isCanceled = true
          statusName = "Pagamento Cancelado"
          break
        case 8: // Reembolsado
          isRefunded = true
          statusName = "Pagamento Reembolsado"
          break
        default:
          statusName = `Status ${status}`
      }
    }
    // Status SuperPayBR (strings)
    else if (typeof status === "string") {
      const statusLower = status.toLowerCase()
      if (statusLower.includes("paid") || statusLower.includes("pago") || statusLower.includes("confirmed")) {
        isPaid = true
        statusName = "Pagamento Confirmado!"
      } else if (statusLower.includes("denied") || statusLower.includes("negado") || statusLower.includes("rejected")) {
        isDenied = true
        statusName = "Pagamento Negado"
      } else if (statusLower.includes("expired") || statusLower.includes("vencido")) {
        isExpired = true
        statusName = "Pagamento Vencido"
      } else if (statusLower.includes("canceled") || statusLower.includes("cancelado")) {
        isCanceled = true
        statusName = "Pagamento Cancelado"
      } else if (statusLower.includes("refunded") || statusLower.includes("reembolsado")) {
        isRefunded = true
        statusName = "Pagamento Reembolsado"
      }
    }

    console.log("📊 Status processado:", {
      isPaid,
      isDenied,
      isExpired,
      isCanceled,
      isRefunded,
      statusName,
    })

    // Preparar dados para armazenamento
    const webhookData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode: typeof status === "number" ? status : 0,
      statusName,
      amount: typeof amount === "number" ? amount : Number.parseFloat(amount?.toString() || "0"),
      paymentDate: new Date().toISOString(),
      rawData: paymentData,
    }

    console.log("💾 Salvando no Supabase...")

    // Salvar no Supabase
    const { data: savedData, error: supabaseError } = await supabase
      .from("payments")
      .upsert(
        {
          external_id: externalId,
          status: statusName,
          amount: webhookData.amount,
          is_paid: isPaid,
          is_denied: isDenied,
          is_expired: isExpired,
          is_canceled: isCanceled,
          is_refunded: isRefunded,
          payment_date: isPaid ? new Date().toISOString() : null,
          webhook_data: paymentData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      )
      .select()

    if (supabaseError) {
      console.error("❌ Erro ao salvar no Supabase:", supabaseError)
    } else {
      console.log("✅ Dados salvos no Supabase:", savedData)
    }

    // Salvar no localStorage do navegador (para detecção imediata)
    console.log("💾 Preparando dados para localStorage...")
    const localStorageKey = `webhook_payment_${externalId}`

    // Simular salvamento no localStorage (será feito pelo frontend)
    console.log(`📱 Dados para localStorage [${localStorageKey}]:`, JSON.stringify(webhookData, null, 2))

    // Log final
    if (isPaid) {
      console.log("🎉 === PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAYBR ===")
      console.log(`💰 Valor: R$ ${webhookData.amount.toFixed(2)}`)
      console.log(`🆔 External ID: ${externalId}`)
    } else {
      console.log(`📋 Webhook processado - Status: ${statusName}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado com sucesso",
      data: {
        external_id: externalId,
        status: statusName,
        is_paid: isPaid,
        amount: webhookData.amount,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao processar webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook SuperPayBR está funcionando",
    timestamp: new Date().toISOString(),
  })
}
