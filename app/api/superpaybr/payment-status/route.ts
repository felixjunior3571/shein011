import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Importar armazenamento global do webhook
const paymentConfirmations = new Map<string, any>()

function getPaymentConfirmation(identifier: string) {
  // Buscar por external_id
  let confirmation = paymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por invoice_id
  confirmation = paymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por token
  confirmation = paymentConfirmations.get(`token_${identifier}`)
  if (confirmation) return confirmation

  return null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")
    const action = searchParams.get("action")

    console.log("🔍 Verificando status de pagamento SuperPayBR:", { externalId, invoiceId, token, action })

    if (action === "all") {
      // Buscar todas as confirmações no Supabase
      const { data: webhooks, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpaybr")
        .order("received_at", { ascending: false })
        .limit(50)

      if (error) {
        console.log("❌ Erro ao buscar webhooks no Supabase:", error)
        return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: webhooks || [],
      })
    }

    if (action === "events") {
      // Buscar eventos recentes no Supabase
      const { data: events, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpaybr")
        .order("received_at", { ascending: false })
        .limit(20)

      if (error) {
        console.log("❌ Erro ao buscar eventos no Supabase:", error)
        return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        data: events || [],
      })
    }

    // Determinar identificador para busca
    const identifier = externalId || invoiceId || token
    if (!identifier) {
      return NextResponse.json(
        {
          success: false,
          error: "External ID, Invoice ID ou Token obrigatório",
        },
        { status: 400 },
      )
    }

    // Primeiro, buscar na memória global
    let confirmation = null

    if (externalId) {
      confirmation = getPaymentConfirmation(externalId)
      console.log(
        `🔍 Busca em memória por External ID (${externalId}):`,
        confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO",
      )
    }

    if (!confirmation && invoiceId) {
      confirmation = getPaymentConfirmation(invoiceId)
      console.log(`🔍 Busca em memória por Invoice ID (${invoiceId}):`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")
    }

    if (!confirmation && token) {
      confirmation = getPaymentConfirmation(`token_${token}`)
      console.log(`🔍 Busca em memória por Token (${token}):`, confirmation ? "ENCONTRADO" : "NÃO ENCONTRADO")
    }

    // Se não encontrou na memória, buscar no Supabase
    if (!confirmation) {
      console.log("🔍 Buscando no Supabase...")

      let query = supabase.from("payment_webhooks").select("*").eq("gateway", "superpaybr")

      if (externalId) {
        query = query.eq("external_id", externalId)
      } else if (invoiceId) {
        query = query.eq("invoice_id", invoiceId)
      } else if (token) {
        query = query.eq("token", token)
      }

      const { data: webhookData, error } = await query.single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = No rows found
        console.log("❌ Erro ao buscar no Supabase:", error)
        return NextResponse.json({ success: false, error: "Database error" }, { status: 500 })
      }

      if (webhookData) {
        confirmation = {
          externalId: webhookData.external_id,
          invoiceId: webhookData.invoice_id,
          token: webhookData.token,
          isPaid: webhookData.is_paid,
          isDenied: webhookData.is_denied,
          isRefunded: webhookData.is_refunded,
          isExpired: webhookData.is_expired,
          isCanceled: webhookData.is_canceled,
          amount: webhookData.amount,
          paymentDate: webhookData.payment_date,
          statusCode: webhookData.status_code,
          statusName: webhookData.status_description,
          receivedAt: webhookData.received_at,
        }
        console.log("✅ Confirmação encontrada no Supabase")
      }
    }

    if (!confirmation) {
      console.log("⏳ Nenhuma confirmação encontrada para:", identifier)
      return NextResponse.json({
        success: true,
        found: false,
        message: "No webhook data found yet",
      })
    }

    console.log("✅ Confirmação encontrada:", {
      externalId: confirmation.externalId,
      isPaid: confirmation.isPaid,
      isDenied: confirmation.isDenied,
      isExpired: confirmation.isExpired,
      isCanceled: confirmation.isCanceled,
      isRefunded: confirmation.isRefunded,
    })

    // Resposta estruturada
    return NextResponse.json({
      success: true,
      found: true,
      data: {
        externalId: confirmation.externalId,
        invoiceId: confirmation.invoiceId,
        token: confirmation.token,
        isPaid: confirmation.isPaid,
        isDenied: confirmation.isDenied,
        isRefunded: confirmation.isRefunded,
        isExpired: confirmation.isExpired,
        isCanceled: confirmation.isCanceled,
        amount: confirmation.amount,
        paymentDate: confirmation.paymentDate,
        statusCode: confirmation.statusCode,
        statusName: confirmation.statusName,
        receivedAt: confirmation.receivedAt,
      },
    })
  } catch (error) {
    console.error("❌ Erro na verificação de status SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
