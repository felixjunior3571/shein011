import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")
    const invoiceId = searchParams.get("invoice_id")

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id ou invoice_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("=== CONSULTANDO STATUS SUPERPAYBR ===")
    console.log("External ID:", externalId)
    console.log("Invoice ID:", invoiceId)

    // Primeiro, tentar buscar no Supabase (webhook)
    let webhookData = null
    try {
      const query = supabase.from("payment_webhooks").select("*").order("created_at", { ascending: false }).limit(1)

      if (externalId) {
        query.eq("external_id", externalId)
      } else if (invoiceId) {
        query.eq("invoice_id", invoiceId)
      }

      const { data, error } = await query

      if (!error && data && data.length > 0) {
        webhookData = data[0]
        console.log("✅ Status encontrado no webhook:", webhookData.status)
      }
    } catch (supabaseError) {
      console.log("⚠️ Erro ao consultar Supabase:", supabaseError)
    }

    // Se encontrou no webhook, retornar
    if (webhookData) {
      return NextResponse.json({
        success: true,
        data: {
          external_id: webhookData.external_id,
          invoice_id: webhookData.invoice_id,
          status: webhookData.status,
          status_code: webhookData.status_code,
          status_title: webhookData.status_title,
          amount: webhookData.amount,
          payment_date: webhookData.payment_date,
          payment_url: webhookData.payment_url,
          qr_code: webhookData.qr_code,
          pix_code: webhookData.pix_code,
          updated_at: webhookData.created_at,
        },
        source: "webhook",
      })
    }

    // Se não encontrou no webhook, consultar API SuperPayBR
    console.log("🔍 Consultando API SuperPayBR...")

    // Obter token de autenticação
    const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`)
    const authResult = await authResponse.json()

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Erro na autenticação SuperPayBR",
        },
        { status: 401 },
      )
    }

    const accessToken = authResult.data.access_token

    // Consultar fatura na SuperPayBR
    const queryParam = invoiceId ? `id=${invoiceId}` : `external_id=${externalId}`
    const statusResponse = await fetch(`https://api.superpaybr.com/invoices?${queryParam}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      console.log("✅ Status obtido da API SuperPayBR")

      // Mapear resposta da API
      const invoice = statusData.invoices?.[0]
      if (invoice) {
        return NextResponse.json({
          success: true,
          data: {
            external_id: externalId,
            invoice_id: invoice.id,
            status: mapSuperPayStatus(invoice.status?.code || 1),
            status_code: invoice.status?.code,
            status_title: invoice.status?.title,
            amount: invoice.prices?.total,
            payment_date: invoice.payment?.date,
            updated_at: new Date().toISOString(),
          },
          source: "api",
        })
      }
    }

    // Se não encontrou em lugar nenhum, retornar status padrão
    console.log("⚠️ Status não encontrado, retornando padrão")
    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        invoice_id: invoiceId,
        status: "pending",
        status_code: 1,
        status_title: "Aguardando Pagamento",
        amount: null,
        payment_date: null,
        updated_at: new Date().toISOString(),
      },
      source: "default",
    })
  } catch (error) {
    console.log("❌ Erro ao consultar status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao consultar status",
      },
      { status: 500 },
    )
  }
}

// Função auxiliar para mapear status
function mapSuperPayStatus(statusCode: number): string {
  const statusMap: Record<number, string> = {
    1: "pending", // Aguardando Pagamento
    2: "processing", // Em Processamento
    3: "scheduled", // Pagamento Agendado
    4: "authorized", // Autorizado
    5: "paid", // Pago ✅
    6: "canceled", // Cancelado
    7: "refund_pending", // Aguardando Estorno
    8: "partially_refunded", // Parcialmente Estornado
    9: "refunded", // Estornado
    10: "disputed", // Contestado/Em Contestação
    12: "denied", // Pagamento Negado ❌
    15: "expired", // Pagamento Vencido ⏰
    16: "error", // Erro no Pagamento
  }

  return statusMap[statusCode] || "unknown"
}
