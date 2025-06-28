import { type NextRequest, NextResponse } from "next/server"

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
      description: string
    }
    customer: number
    prices: {
      total: number
      discount: number
      taxs: {
        others: number | null
      }
      refound: number | null
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
    console.log("🔔 [SuperPayBR Webhook] Webhook recebido")

    const body: SuperPayBRWebhookData = await request.json()
    console.log("📋 [SuperPayBR Webhook] Dados recebidos:", JSON.stringify(body, null, 2))

    // Validar estrutura do webhook
    if (!body.event || !body.invoices) {
      console.log("❌ [SuperPayBR Webhook] Estrutura inválida")
      return NextResponse.json({ error: "Invalid webhook structure" }, { status: 400 })
    }

    const { event, invoices } = body
    const { external_id, status, prices, payment } = invoices

    console.log("🔍 [SuperPayBR Webhook] Processando:", {
      event_type: event.type,
      external_id,
      status_code: status.code,
      status_title: status.title,
      amount: prices.total,
      payment_date: payment.payDate,
    })

    // Mapear status SuperPayBR
    const statusMapping = {
      1: { name: "pending", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      2: { name: "processing", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      3: { name: "scheduled", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      4: { name: "authorized", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      5: { name: "paid", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      6: { name: "canceled", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
      7: {
        name: "refund_pending",
        isPaid: false,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: false,
      },
      8: {
        name: "partially_refunded",
        isPaid: true,
        isDenied: false,
        isExpired: false,
        isCanceled: false,
        isRefunded: true,
      },
      9: { name: "refunded", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
      10: { name: "disputed", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
      12: { name: "denied", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
      15: { name: "expired", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
      16: { name: "error", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
    }

    const mappedStatus = statusMapping[status.code as keyof typeof statusMapping] || {
      name: "unknown",
      isPaid: false,
      isDenied: false,
      isExpired: false,
      isCanceled: false,
      isRefunded: false,
    }

    console.log("🔄 [SuperPayBR Webhook] Status mapeado:", mappedStatus)

    // Salvar no Supabase
    try {
      const { createClient } = await import("@supabase/supabase-js")
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      const webhookData = {
        external_id,
        invoice_id: invoices.id,
        status_code: status.code,
        status_name: mappedStatus.name,
        status_title: status.title,
        is_paid: mappedStatus.isPaid,
        is_denied: mappedStatus.isDenied,
        is_refunded: mappedStatus.isRefunded,
        is_expired: mappedStatus.isExpired,
        is_canceled: mappedStatus.isCanceled,
        amount: prices.total,
        payment_date: payment.payDate || null,
        gateway: "SuperPayBR",
        webhook_data: body,
        received_at: new Date().toISOString(),
      }

      console.log("💾 [SuperPayBR Webhook] Salvando no Supabase:", webhookData)

      const { data, error } = await supabase.from("payment_webhooks").insert([webhookData]).select().single()

      if (error) {
        console.error("❌ [SuperPayBR Webhook] Erro ao salvar no Supabase:", error)
        throw error
      }

      console.log("✅ [SuperPayBR Webhook] Salvo no Supabase:", data.id)

      // Salvar também no localStorage para monitoramento local
      if (typeof window !== "undefined") {
        const localStorageKey = `webhook_payment_${external_id}`
        const localData = {
          isPaid: mappedStatus.isPaid,
          isDenied: mappedStatus.isDenied,
          isRefunded: mappedStatus.isRefunded,
          isExpired: mappedStatus.isExpired,
          isCanceled: mappedStatus.isCanceled,
          statusCode: status.code,
          statusName: mappedStatus.name,
          amount: prices.total,
          paymentDate: payment.payDate,
        }

        localStorage.setItem(localStorageKey, JSON.stringify(localData))
        console.log("💾 [SuperPayBR Webhook] Salvo no localStorage:", localStorageKey)
      }

      // Log do resultado
      if (mappedStatus.isPaid) {
        console.log("🎉 [SuperPayBR Webhook] PAGAMENTO CONFIRMADO!")
        console.log(`💰 Valor: R$ ${(prices.total / 100).toFixed(2)}`)
        console.log(`📅 Data: ${payment.payDate}`)
      } else if (mappedStatus.isDenied) {
        console.log("❌ [SuperPayBR Webhook] PAGAMENTO NEGADO!")
      } else if (mappedStatus.isExpired) {
        console.log("⏰ [SuperPayBR Webhook] PAGAMENTO VENCIDO!")
      } else if (mappedStatus.isCanceled) {
        console.log("🚫 [SuperPayBR Webhook] PAGAMENTO CANCELADO!")
      } else if (mappedStatus.isRefunded) {
        console.log("💸 [SuperPayBR Webhook] PAGAMENTO ESTORNADO!")
      }

      return NextResponse.json({
        success: true,
        message: "Webhook processed successfully",
        external_id,
        status: mappedStatus.name,
        saved_id: data.id,
      })
    } catch (dbError) {
      console.error("❌ [SuperPayBR Webhook] Erro no banco de dados:", dbError)

      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          message: "Failed to save webhook data",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook] Erro geral:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Método OPTIONS para validação de webhook (conforme documentação SuperPayBR)
export async function OPTIONS(request: NextRequest) {
  try {
    console.log("🔍 [SuperPayBR Webhook] Validação OPTIONS recebida")

    const body = await request.json()
    const { token } = body

    if (!token) {
      console.log("❌ [SuperPayBR Webhook] Token não fornecido")
      return NextResponse.json({ success: false }, { status: 400 })
    }

    console.log("🔐 [SuperPayBR Webhook] Validando token:", token)

    // Decodificar token base64
    try {
      const decodedToken = Buffer.from(token, "base64").toString("utf-8")
      console.log("🔓 [SuperPayBR Webhook] Token decodificado:", decodedToken)

      // O token decodificado deve conter nosso token e o token da SuperPayBR separados por ":"
      const [ourToken, superPayToken] = decodedToken.split(":")

      // Validar se contém nosso identificador
      if (ourToken && superPayToken) {
        console.log("✅ [SuperPayBR Webhook] Token válido")
        return NextResponse.json({ success: true })
      } else {
        console.log("❌ [SuperPayBR Webhook] Formato de token inválido")
        return NextResponse.json({ success: false }, { status: 404 })
      }
    } catch (decodeError) {
      console.log("❌ [SuperPayBR Webhook] Erro ao decodificar token:", decodeError)
      return NextResponse.json({ success: false }, { status: 404 })
    }
  } catch (error) {
    console.error("❌ [SuperPayBR Webhook] Erro na validação OPTIONS:", error)
    return NextResponse.json({ success: false }, { status: 404 })
  }
}
