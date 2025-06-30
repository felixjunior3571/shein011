import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Função para gerar token único
function generateSuperPayToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_SIM_${timestamp}_${random}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { externalId, amount = 34.9, statusCode = 5 } = body

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "externalId é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🧪 Simulando pagamento SuperPay:", {
      externalId,
      amount,
      statusCode,
    })

    // Status mapping para simulação
    const statusMap = {
      5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      12: { name: "Negado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
      15: { name: "Vencido", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
      6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
      9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
    } as const

    const statusInfo = statusMap[statusCode as keyof typeof statusMap] || statusMap[5]

    // Gerar token único com expiração de 15 minutos
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000)
    const token = generateSuperPayToken()

    // Simular webhook data
    const simulatedWebhookData = {
      event: {
        type: "payment_status_changed",
        date: now.toISOString(),
      },
      invoices: {
        id: `SIM_${externalId}`,
        external_id: externalId,
        token: token,
        date: now.toISOString(),
        status: {
          code: statusCode,
          title: statusInfo.name,
          description: `Pagamento simulado - ${statusInfo.name}`,
          text: statusInfo.name.toLowerCase(),
        },
        customer: 1,
        prices: {
          total: amount,
          discount: 0,
          taxs: {
            others: 0,
          },
          refound: null,
        },
        type: "pix",
        payment: {
          gateway: "superpay_simulation",
          date: now.toISOString(),
          due: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          card: null,
          payId: `PAY_SIM_${Date.now()}`,
          payDate: statusInfo.isPaid ? now.toISOString() : "",
          details: {
            barcode: null,
            pix_code: `SIM_PIX_${Date.now()}`,
            qrcode: "simulated_qrcode_data",
            url: null,
          },
        },
      },
    }

    // Verificar se registro existe
    const { data: existingRecord } = await supabase
      .from("payment_webhooks")
      .select("id")
      .eq("external_id", externalId)
      .eq("gateway", "superpay")
      .single()

    const webhookRecord = {
      external_id: externalId,
      invoice_id: `SIM_${externalId}`,
      status_code: statusCode,
      status_name: statusInfo.name,
      amount: amount,
      payment_date: statusInfo.isPaid ? now.toISOString() : null,
      webhook_data: simulatedWebhookData,
      processed_at: now.toISOString(),
      is_paid: statusInfo.isPaid,
      is_denied: statusInfo.isDenied,
      is_expired: statusInfo.isExpired,
      is_canceled: statusInfo.isCanceled,
      is_refunded: statusInfo.isRefunded,
      gateway: "superpay",
      token: token,
      expires_at: expiresAt.toISOString(),
      is_critical: true, // Simulações são sempre críticas
    }

    let result
    if (existingRecord) {
      // Atualizar registro existente
      result = await supabase
        .from("payment_webhooks")
        .update(webhookRecord)
        .eq("id", existingRecord.id)
        .select()
        .single()

      console.log(`✅ Simulação SuperPay ATUALIZADA no Supabase:`, result.data?.id)
    } else {
      // Inserir novo registro
      result = await supabase.from("payment_webhooks").insert(webhookRecord).select().single()

      console.log(`✅ Simulação SuperPay INSERIDA no Supabase:`, result.data?.id)
    }

    if (result.error) {
      console.error("❌ Erro ao salvar simulação no Supabase:", result.error)
      throw result.error
    }

    console.log("🎯 Simulação SuperPay concluída:", {
      external_id: externalId,
      status: statusInfo.name,
      amount: amount,
      token: token,
      expires_at: expiresAt.toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: "Pagamento SuperPay simulado com sucesso",
      data: {
        external_id: externalId,
        invoice_id: `SIM_${externalId}`,
        status_code: statusCode,
        status_name: statusInfo.name,
        amount: amount,
        is_paid: statusInfo.isPaid,
        is_denied: statusInfo.isDenied,
        is_expired: statusInfo.isExpired,
        is_canceled: statusInfo.isCanceled,
        is_refunded: statusInfo.isRefunded,
        token: token,
        expires_at: expiresAt.toISOString(),
        simulated: true,
        processed_at: now.toISOString(),
      },
    })
  } catch (error) {
    console.error("❌ Erro na simulação SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "SuperPay Payment Simulation Endpoint",
    status: "active",
    supported_methods: ["POST"],
    available_status_codes: {
      5: "Pago",
      12: "Negado",
      15: "Vencido",
      6: "Cancelado",
      9: "Estornado",
    },
    example_request: {
      externalId: "SHEIN_1234567890_abc123",
      amount: 34.9,
      statusCode: 5,
    },
    timestamp: new Date().toISOString(),
  })
}
