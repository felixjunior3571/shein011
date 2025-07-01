import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório",
          message: "É necessário informar externalId ou invoiceId",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Consultando status: externalId=${externalId}, invoiceId=${invoiceId}`)

    // Consultar no banco de dados
    let query = supabase.from("payment_webhooks").select("*").eq("gateway", "superpaybr")

    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === "PGRST116") {
        // Não encontrado
        console.log("❌ Pagamento não encontrado")
        return NextResponse.json({
          success: true,
          found: false,
          status: "pending",
          message: "Pagamento não encontrado ou ainda pendente",
        })
      }

      console.error("❌ Erro na consulta:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro de banco de dados",
          message: error.message,
        },
        { status: 500 },
      )
    }

    // Mapear status para resposta
    let status = "pending"
    let shouldRedirect = false
    let redirectUrl = null

    if (data.is_paid) {
      status = "paid"
      shouldRedirect = true
      redirectUrl = "/upp/001"
    } else if (data.is_denied) {
      status = "denied"
    } else if (data.is_expired) {
      status = "expired"
    } else if (data.is_canceled) {
      status = "canceled"
    } else if (data.is_refunded) {
      status = "refunded"
    }

    console.log(`📊 Status encontrado: ${status} | Redirect: ${shouldRedirect}`)

    const response = {
      success: true,
      found: true,
      status,
      shouldRedirect,
      redirectUrl,
      data: {
        external_id: data.external_id,
        invoice_id: data.invoice_id,
        status_code: data.status_code,
        status_title: data.status_title,
        status_description: data.status_description,
        amount: data.amount,
        payment_date: data.payment_date,
        is_paid: data.is_paid,
        is_denied: data.is_denied,
        is_expired: data.is_expired,
        is_canceled: data.is_canceled,
        is_refunded: data.is_refunded,
        updated_at: data.updated_at,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("💥 Erro na consulta de status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
