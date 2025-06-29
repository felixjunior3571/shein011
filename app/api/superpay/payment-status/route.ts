import { type NextRequest, NextResponse } from "next/server"
import { getPaymentConfirmation } from "../webhook/route"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("🔍 CONSULTA DE STATUS DE PAGAMENTO SUPERPAY:")
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

    // Buscar confirmação por qualquer um dos identificadores (MEMÓRIA PRIMEIRO - igual TryploPay)
    let confirmation = null
    let searchKey = ""

    if (externalId) {
      confirmation = getPaymentConfirmation(externalId)
      searchKey = externalId
    }

    if (!confirmation && invoiceId) {
      confirmation = getPaymentConfirmation(invoiceId)
      searchKey = invoiceId
    }

    if (!confirmation && token) {
      confirmation = getPaymentConfirmation(`token_${token}`)
      searchKey = `token_${token}`
    }

    // Se não encontrou na memória, buscar no Supabase (fallback)
    if (!confirmation) {
      try {
        let query = supabase.from("payment_webhooks").select("*").eq("gateway", "superpay")

        if (externalId) {
          query = query.eq("external_id", externalId)
        } else if (invoiceId) {
          query = query.eq("invoice_id", invoiceId)
        }

        const { data, error } = await query.single()

        if (!error && data) {
          confirmation = {
            externalId: data.external_id,
            invoiceId: data.invoice_id,
            status: data.is_paid ? "confirmed" : "pending",
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
          searchKey = `supabase_${data.external_id}`
          console.log("✅ CONFIRMAÇÃO ENCONTRADA NO SUPABASE")
        }
      } catch (supabaseError) {
        console.log("❌ Erro ao consultar Supabase:", supabaseError)
      }
    } else {
      console.log("✅ CONFIRMAÇÃO ENCONTRADA NA MEMÓRIA GLOBAL")
    }

    console.log(`🔍 Resultado da busca para "${searchKey}":`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")

    if (!confirmation) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "Nenhuma confirmação encontrada para os parâmetros fornecidos",
        searched_for: { externalId, invoiceId, token },
        note: "Aguardando notificação da adquirente via webhook",
        timestamp: new Date().toISOString(),
      })
    }

    console.log("✅ CONFIRMAÇÃO ENCONTRADA:")
    console.log(JSON.stringify(confirmation, null, 2))

    return NextResponse.json({
      success: true,
      found: true,
      message: "Confirmação encontrada no sistema",
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
