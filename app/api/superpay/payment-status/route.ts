import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("🔍 CONSULTA DE STATUS DE PAGAMENTO SUPERPAY (SUPABASE ONLY):")
    console.log(`- External ID: ${externalId}`)
    console.log(`- Invoice ID: ${invoiceId}`)
    console.log(`- Token: ${token}`)

    if (!externalId && !invoiceId && !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório: externalId, invoiceId ou token",
        },
        { status: 400 },
      )
    }

    // Buscar APENAS NO SUPABASE
    let confirmation = null
    let searchKey = ""

    try {
      let query = supabase.from("payment_webhooks").select("*").eq("gateway", "superpay")

      if (externalId) {
        query = query.eq("external_id", externalId)
        searchKey = `externalId_${externalId}`
      } else if (invoiceId) {
        query = query.eq("invoice_id", invoiceId)
        searchKey = `invoiceId_${invoiceId}`
      } else if (token) {
        // Para token, buscar no webhook_data
        query = query.contains("webhook_data", { token })
        searchKey = `token_${token}`
      }

      const { data, error } = await query.single()

      if (!error && data) {
        confirmation = {
          externalId: data.external_id,
          invoiceId: data.invoice_id,
          status: data.is_paid
            ? "confirmed"
            : data.is_denied
              ? "denied"
              : data.is_expired
                ? "expired"
                : data.is_canceled
                  ? "canceled"
                  : "pending",
          statusCode: data.status_code,
          statusName: data.status_name,
          amount: data.amount,
          paymentDate: data.payment_date,
          payId: data.webhook_data?.invoices?.payment?.payId || null,
          gateway: data.gateway,
          type: data.webhook_data?.invoices?.type || null,
          token: data.webhook_data?.invoices?.token || null,
          isPaid: data.is_paid,
          isRefunded: data.status_code === 9,
          isDenied: data.is_denied,
          isExpired: data.is_expired,
          isCanceled: data.is_canceled,
          processed: true,
          timestamp: data.processed_at,
        }
        console.log("✅ CONFIRMAÇÃO ENCONTRADA NO SUPABASE")
      } else {
        console.log("❌ Erro ao consultar Supabase ou dados não encontrados:", error)
      }
    } catch (supabaseError) {
      console.log("❌ Erro ao conectar com Supabase:", supabaseError)
    }

    console.log(`🔍 Resultado da busca para "${searchKey}":`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")

    if (!confirmation) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "Nenhuma confirmação encontrada para os parâmetros fornecidos",
        searched_for: { externalId, invoiceId, token },
        note: "Aguardando notificação da adquirente via webhook",
        storage: "supabase_only",
        timestamp: new Date().toISOString(),
      })
    }

    console.log("✅ CONFIRMAÇÃO ENCONTRADA NO SUPABASE:")
    console.log(JSON.stringify(confirmation, null, 2))

    return NextResponse.json({
      success: true,
      found: true,
      message: "Confirmação encontrada no Supabase",
      data: {
        externalId: confirmation.externalId,
        invoiceId: confirmation.invoiceId,
        status: confirmation.status,
        statusCode: confirmation.statusCode,
        statusName: confirmation.statusName,
        amount: confirmation.amount,
        paymentDate: confirmation.paymentDate,
        payId: confirmation.payId,
        gateway: confirmation.gateway,
        type: confirmation.type,
        token: confirmation.token,
        isPaid: confirmation.isPaid,
        isRefunded: confirmation.isRefunded,
        isDenied: confirmation.isDenied,
        isExpired: confirmation.isExpired,
        isCanceled: confirmation.isCanceled,
        processed: confirmation.processed,
        timestamp: confirmation.timestamp,
      },
      searched_with: searchKey,
      storage: "supabase_only",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Erro ao consultar status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
