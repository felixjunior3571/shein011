import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSuperPayAccessToken } from "@/lib/superpaybr-auth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get("invoice_id")
    const externalId = searchParams.get("external_id")

    if (!invoiceId && !externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "invoice_id ou external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 === VERIFICANDO PAGAMENTO SUPERPAYBR ===")
    console.log("📋 Invoice ID:", invoiceId)
    console.log("📋 External ID:", externalId)

    // Verificar no Supabase primeiro
    const { data: payment, error } = await supabase
      .from("superpaybr_payments")
      .select("*")
      .or(`invoice_id.eq.${invoiceId || externalId},external_id.eq.${externalId || invoiceId}`)
      .single()

    if (payment) {
      console.log("✅ Pagamento encontrado no Supabase:", payment.status)
      return NextResponse.json({
        success: true,
        data: {
          invoice_id: payment.invoice_id,
          external_id: payment.external_id,
          status: payment.status,
          amount: payment.amount,
          payment_method: payment.payment_method,
          updated_at: payment.updated_at,
          source: "supabase",
        },
      })
    }

    // Se não encontrou no Supabase, consultar API SuperPayBR
    try {
      const accessToken = await getSuperPayAccessToken()

      const checkResponse = await fetch(`https://api.superpaybr.com/v4/invoices/${invoiceId || externalId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (checkResponse.ok) {
        const apiData = await checkResponse.json()
        console.log("✅ Pagamento encontrado na API SuperPayBR")

        // Salvar no Supabase para cache
        await supabase.from("superpaybr_payments").upsert({
          invoice_id: apiData.id || invoiceId,
          external_id: apiData.external_id || externalId,
          status: apiData.status || "pending",
          amount: apiData.amount || 0,
          payment_method: "pix",
          webhook_data: apiData,
          updated_at: new Date().toISOString(),
        })

        return NextResponse.json({
          success: true,
          data: {
            invoice_id: apiData.id || invoiceId,
            external_id: apiData.external_id || externalId,
            status: apiData.status || "pending",
            amount: apiData.amount || 0,
            payment_method: "pix",
            source: "api",
          },
        })
      }
    } catch (apiError) {
      console.log("⚠️ Erro ao consultar API SuperPayBR:", apiError)
    }

    return NextResponse.json({
      success: false,
      error: "Pagamento não encontrado",
      invoice_id: invoiceId,
      external_id: externalId,
    })
  } catch (error) {
    console.error("❌ Erro ao verificar pagamento:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao verificar pagamento",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
