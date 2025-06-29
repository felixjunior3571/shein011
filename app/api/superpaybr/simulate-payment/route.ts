import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 === SIMULANDO PAGAMENTO SUPERPAYBR ===")

    const body = await request.json()
    const { external_id, amount = 34.9, status = "paid" } = body

    if (!external_id) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🎯 Simulando pagamento:", { external_id, amount, status })

    // Determinar status baseado no parâmetro
    let statusCode = 5 // Pago por padrão
    let statusName = "Pagamento Confirmado!"
    let isPaid = true
    let isDenied = false
    let isExpired = false
    let isCanceled = false
    let isRefunded = false

    switch (status) {
      case "paid":
        statusCode = 5
        statusName = "Pagamento Confirmado!"
        isPaid = true
        break
      case "denied":
        statusCode = 3
        statusName = "Pagamento Negado"
        isPaid = false
        isDenied = true
        break
      case "expired":
        statusCode = 6
        statusName = "Pagamento Expirado"
        isPaid = false
        isExpired = true
        break
      case "canceled":
        statusCode = 7
        statusName = "Pagamento Cancelado"
        isPaid = false
        isCanceled = true
        break
      case "refunded":
        statusCode = 8
        statusName = "Pagamento Estornado"
        isPaid = false
        isRefunded = true
        break
    }

    // Salvar simulação no Supabase
    try {
      const { data, error } = await supabase.from("superpaybr_payments").insert({
        external_id: external_id,
        invoice_id: `SIM_${Date.now()}`,
        status_code: statusCode,
        status_name: statusName,
        amount: Number.parseFloat(amount.toString()),
        payment_date: new Date().toISOString(),
        customer_name: "Cliente Simulado",
        customer_email: "simulado@teste.com",
        is_paid: isPaid,
        is_denied: isDenied,
        is_expired: isExpired,
        is_canceled: isCanceled,
        is_refunded: isRefunded,
        raw_webhook_data: {
          simulated: true,
          external_id,
          status,
          amount,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("❌ Erro ao salvar simulação:", error)
      } else {
        console.log("✅ Simulação salva no Supabase:", data)
      }
    } catch (supabaseError) {
      console.error("❌ Erro de conexão Supabase:", supabaseError)
    }

    // Dados para o cliente
    const clientData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName,
      amount: Number.parseFloat(amount.toString()),
      paymentDate: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      simulated: true,
    }

    // Salvar dados para broadcast
    try {
      await supabase.from("payment_updates").insert({
        external_id: external_id,
        payment_data: clientData,
        created_at: new Date().toISOString(),
      })
    } catch (broadcastError) {
      console.log("⚠️ Erro no broadcast (não crítico):", broadcastError)
    }

    console.log(`✅ Pagamento SuperPayBR simulado: ${statusName}`)

    return NextResponse.json({
      success: true,
      message: `Pagamento SuperPayBR simulado: ${statusName}`,
      simulation: {
        external_id,
        status: {
          isPaid,
          isDenied,
          isExpired,
          isCanceled,
          isRefunded,
          statusCode,
          statusName,
        },
        amount: Number.parseFloat(amount.toString()),
        client_data: clientData,
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno na simulação",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para simular pagamento.",
    },
    { status: 405 },
  )
}
