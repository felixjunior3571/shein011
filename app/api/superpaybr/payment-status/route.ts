import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consultando status do pagamento SuperPayBR:", externalId)

    // Buscar no Supabase primeiro
    const { data, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("external_id", externalId)
      .eq("provider", "superpaybr")
      .order("processed_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.log("❌ Erro ao consultar Supabase SuperPayBR:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao consultar banco de dados",
        },
        { status: 500 },
      )
    }

    if (data) {
      // Mapear dados para formato esperado (IDÊNTICO AO SISTEMA TRYPLOPAY)
      const paymentData = {
        externalId: data.external_id,
        invoiceId: data.invoice_id,
        amount: data.amount,
        status: data.status_name,
        statusCode: data.status_code,
        statusName: data.status_title,
        statusDescription: data.status_description,
        paymentDate: data.payment_date,
        paymentGateway: data.payment_gateway,
        paymentType: data.payment_type,
        isPaid: data.is_paid,
        isDenied: data.is_denied,
        isExpired: data.is_expired,
        isCanceled: data.is_canceled,
        isRefunded: data.is_refunded,
        token: data.webhook_token,
        provider: data.provider,
        processedAt: data.processed_at,
      }

      console.log("✅ Status SuperPayBR encontrado no Supabase:", {
        external_id: externalId,
        status: data.status_name,
        is_paid: data.is_paid,
      })

      return NextResponse.json({
        success: true,
        data: paymentData,
      })
    }

    // Se não encontrou no Supabase, tentar consultar diretamente na API SuperPayBR
    console.log("⚠️ Pagamento não encontrado no Supabase, consultando API SuperPayBR...")

    try {
      // Fazer autenticação
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
        method: "POST",
      })
      const authResult = await authResponse.json()

      if (!authResult.success) {
        throw new Error("Falha na autenticação SuperPayBR")
      }

      const accessToken = authResult.data.access_token

      // Consultar fatura por external_id
      const statusResponse = await fetch(`https://api.superpaybr.com/invoices?external_id=${externalId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        const invoice = statusData.invoices?.[0]

        if (invoice) {
          const isPaid = invoice.status.code === 5
          const isDenied = invoice.status.code === 12
          const isExpired = invoice.status.code === 15
          const isCanceled = invoice.status.code === 6
          const isRefunded = invoice.status.code === 9

          const apiPaymentData = {
            externalId,
            invoiceId: invoice.id,
            amount: invoice.prices.total,
            status: isPaid
              ? "paid"
              : isDenied
                ? "denied"
                : isExpired
                  ? "expired"
                  : isCanceled
                    ? "canceled"
                    : isRefunded
                      ? "refunded"
                      : "pending",
            statusCode: invoice.status.code,
            statusName: invoice.status.title,
            statusDescription: invoice.status.description,
            paymentDate: invoice.payment.payDate,
            paymentGateway: invoice.payment.gateway,
            paymentType: invoice.type,
            isPaid,
            isDenied,
            isExpired,
            isCanceled,
            isRefunded,
            token: invoice.token,
            provider: "superpaybr",
            processedAt: new Date().toISOString(),
          }

          console.log("✅ Status SuperPayBR obtido via API:", apiPaymentData)

          return NextResponse.json({
            success: true,
            data: apiPaymentData,
          })
        }
      }
    } catch (apiError) {
      console.log("⚠️ Erro ao consultar API SuperPayBR:", apiError)
    }

    console.log("⚠️ Pagamento SuperPayBR não encontrado:", externalId)
    return NextResponse.json({
      success: false,
      message: "Pagamento não encontrado",
    })
  } catch (error) {
    console.log("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno",
      },
      { status: 500 },
    )
  }
}
