import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    let paymentData = null
    let externalId = ""
    let status = ""
    let amount = 0
    let isPaid = false

    // Buscar dados em diferentes estruturas possíveis
    if (body.invoice) {
      paymentData = body.invoice
    } else if (body.payment) {
      paymentData = body.payment
    } else if (body.data) {
      paymentData = body.data
    } else {
      paymentData = body
    }

    // Extrair external_id
    externalId = paymentData.external_id || paymentData.id || paymentData.invoice_id || ""

    // Extrair status
    status = paymentData.status || paymentData.payment_status || ""

    // Extrair amount
    amount = paymentData.amount || paymentData.value || 0

    // Determinar se está pago
    if (typeof status === "number") {
      isPaid = status === 5 || status === 2 // SuperPayBR: 5 = Pago, 2 = Aprovado
    } else if (typeof status === "string") {
      isPaid =
        status.toLowerCase().includes("paid") ||
        status.toLowerCase().includes("approved") ||
        status.toLowerCase().includes("pago")
    }

    console.log("📊 Dados extraídos do webhook:", {
      externalId,
      status,
      amount,
      isPaid,
    })

    if (!externalId) {
      console.error("❌ External ID não encontrado no webhook")
      return NextResponse.json(
        {
          success: false,
          error: "External ID não encontrado",
        },
        { status: 400 },
      )
    }

    // Salvar/atualizar no Supabase
    const { data: savedData, error: supabaseError } = await supabase
      .from("payments")
      .upsert(
        {
          external_id: externalId,
          status: isPaid ? "Pagamento Confirmado!" : status.toString(),
          amount: typeof amount === "number" ? amount : Number.parseFloat(amount?.toString() || "0"),
          is_paid: isPaid,
          is_denied: false,
          is_expired: false,
          is_canceled: false,
          is_refunded: false,
          payment_date: isPaid ? new Date().toISOString() : null,
          webhook_data: paymentData,
          provider: "superpaybr",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      )
      .select()

    if (supabaseError) {
      console.error("❌ Erro ao salvar no Supabase:", supabaseError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao salvar dados do webhook",
          details: supabaseError.message,
        },
        { status: 500 },
      )
    }

    console.log("✅ Webhook processado e salvo no Supabase:", savedData)

    // Log específico para pagamentos aprovados
    if (isPaid) {
      console.log("🎉 === PAGAMENTO APROVADO ===")
      console.log(`💰 External ID: ${externalId}`)
      console.log(`💵 Valor: R$ ${amount}`)
      console.log(`📅 Data: ${new Date().toISOString()}`)
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id: externalId,
        status: isPaid ? "Pagamento Confirmado!" : status.toString(),
        is_paid: isPaid,
        amount: amount,
        processed_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar webhook",
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
