import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Dados do webhook:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook SuperPayBR
    let externalId = ""
    let status = ""
    let statusCode = 0
    let amount = 0
    let paymentDate = ""

    // Função recursiva para encontrar dados do pagamento
    const findPaymentData = (obj: any, path = "", depth = 0): void => {
      if (!obj || typeof obj !== "object" || depth > 10) return

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key

        // Buscar external_id
        if (
          (key === "external_id" || key === "reference" || key === "order_id") &&
          typeof value === "string" &&
          !externalId
        ) {
          externalId = value
          console.log(`🔍 External ID encontrado: ${externalId}`)
        }

        // Buscar status
        if ((key === "status" || key === "payment_status") && typeof value === "string" && !status) {
          status = value
          console.log(`🔍 Status encontrado: ${status}`)
        }

        // Buscar status code
        if ((key === "status_code" || key === "code") && typeof value === "number" && !statusCode) {
          statusCode = value
          console.log(`🔍 Status code encontrado: ${statusCode}`)
        }

        // Buscar amount
        if ((key === "amount" || key === "value" || key === "total") && typeof value === "number" && !amount) {
          amount = value
          console.log(`🔍 Amount encontrado: ${amount}`)
        }

        // Buscar payment date
        if (
          (key === "payment_date" || key === "paid_at" || key === "created_at") &&
          typeof value === "string" &&
          !paymentDate
        ) {
          paymentDate = value
          console.log(`🔍 Payment date encontrado: ${paymentDate}`)
        }

        // Continuar busca recursiva
        if (typeof value === "object" && value !== null) {
          findPaymentData(value, currentPath, depth + 1)
        }
      }
    }

    findPaymentData(body)

    console.log("🔍 Dados extraídos do webhook:", {
      externalId,
      status,
      statusCode,
      amount,
      paymentDate,
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

    // Determinar status do pagamento
    let isPaid = false
    let isDenied = false
    let isRefunded = false
    let isExpired = false
    let isCanceled = false

    // SuperPayBR status codes (ajustar conforme documentação)
    switch (statusCode) {
      case 5: // Pago
      case 200: // Success
        isPaid = true
        status = "paid"
        break
      case 3: // Negado
      case 400: // Denied
        isDenied = true
        status = "denied"
        break
      case 6: // Estornado
        isRefunded = true
        status = "refunded"
        break
      case 7: // Vencido
        isExpired = true
        status = "expired"
        break
      case 8: // Cancelado
        isCanceled = true
        status = "canceled"
        break
      default:
        console.log(`⚠️ Status code desconhecido: ${statusCode}`)
    }

    // Também verificar por strings de status
    if (status) {
      const statusLower = status.toLowerCase()
      if (statusLower.includes("paid") || statusLower.includes("pago") || statusLower.includes("approved")) {
        isPaid = true
      } else if (statusLower.includes("denied") || statusLower.includes("negado") || statusLower.includes("rejected")) {
        isDenied = true
      } else if (statusLower.includes("refunded") || statusLower.includes("estornado")) {
        isRefunded = true
      } else if (statusLower.includes("expired") || statusLower.includes("vencido")) {
        isExpired = true
      } else if (statusLower.includes("canceled") || statusLower.includes("cancelado")) {
        isCanceled = true
      }
    }

    console.log("📊 Status processado:", {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      finalStatus: status,
    })

    // Salvar no Supabase
    try {
      const { data: insertData, error: insertError } = await supabase.from("superpaybr_payments").insert({
        external_id: externalId,
        status: status,
        status_code: statusCode,
        amount: amount,
        payment_date: paymentDate || new Date().toISOString(),
        is_paid: isPaid,
        is_denied: isDenied,
        is_refunded: isRefunded,
        is_expired: isExpired,
        is_canceled: isCanceled,
        webhook_data: body,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("❌ Erro ao salvar no Supabase:", insertError)
      } else {
        console.log("✅ Webhook salvo no Supabase:", insertData)
      }
    } catch (supabaseError) {
      console.error("❌ Erro de conexão Supabase:", supabaseError)
    }

    // Salvar no localStorage para monitoramento em tempo real
    const webhookData = {
      isPaid,
      isDenied,
      isRefunded,
      isExpired,
      isCanceled,
      statusCode,
      statusName: status,
      amount: amount,
      paymentDate: paymentDate || new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
    }

    console.log("💾 Dados para localStorage:", webhookData)
    console.log(`🔑 Chave localStorage: webhook_payment_${externalId}`)

    // Simular salvamento no localStorage (não funciona no servidor)
    // O frontend vai buscar esses dados via polling ou WebSocket

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id: externalId,
        status: status,
        is_paid: isPaid,
        amount: amount,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno no webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Método GET não suportado. Use POST para webhook.",
    },
    { status: 405 },
  )
}
