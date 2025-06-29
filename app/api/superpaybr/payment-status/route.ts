import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Armazenamento global em memória (mesmo do webhook)
const globalPaymentStorage = new Map<string, any>()

// Cliente Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Consultando status SuperPayBR: ${externalId}`)

    // 1. Primeiro, verificar armazenamento global (mais rápido)
    const cachedData = globalPaymentStorage.get(externalId)

    if (cachedData) {
      console.log("⚡ Dados encontrados no cache global")

      return NextResponse.json({
        success: true,
        isPaid: cachedData.is_paid,
        isDenied: cachedData.is_denied,
        isRefunded: cachedData.is_refunded,
        isExpired: cachedData.is_expired,
        isCanceled: cachedData.is_canceled,
        statusCode: cachedData.status_code,
        statusName: cachedData.status_name,
        amount: cachedData.amount,
        paymentDate: cachedData.payment_date,
        timestamp: cachedData.webhook_received_at,
        source: "global_cache",
      })
    }

    // 2. Se não encontrou no cache, verificar Supabase
    console.log("🔍 Consultando Supabase...")

    try {
      const { data: supabaseData, error: supabaseError } = await supabase
        .from("superpaybr_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single()

      if (supabaseData && !supabaseError) {
        console.log("📊 Dados encontrados no Supabase")

        // Adicionar ao cache global para próximas consultas
        const cacheData = {
          external_id: supabaseData.external_id,
          status_code: supabaseData.status_code,
          status_name: supabaseData.status_name,
          is_paid: supabaseData.is_paid,
          is_denied: supabaseData.is_denied,
          is_expired: supabaseData.is_expired,
          is_canceled: supabaseData.is_canceled,
          is_refunded: supabaseData.is_refunded,
          amount: supabaseData.amount,
          payment_date: supabaseData.payment_date,
          webhook_received_at: supabaseData.updated_at,
        }

        globalPaymentStorage.set(externalId, cacheData)

        return NextResponse.json({
          success: true,
          isPaid: supabaseData.is_paid,
          isDenied: supabaseData.is_denied,
          isRefunded: supabaseData.is_refunded,
          isExpired: supabaseData.is_expired,
          isCanceled: supabaseData.is_canceled,
          statusCode: supabaseData.status_code,
          statusName: supabaseData.status_name,
          amount: supabaseData.amount,
          paymentDate: supabaseData.payment_date,
          timestamp: supabaseData.updated_at,
          source: "supabase",
        })
      }
    } catch (supabaseErr) {
      console.log("⚠️ Erro ao consultar Supabase:", supabaseErr)
    }

    // 3. Se não encontrou em lugar nenhum, consultar API SuperPayBR diretamente
    console.log("🌐 Consultando API SuperPayBR diretamente...")

    try {
      // Obter token de autenticação
      const authResponse = await fetch(`${request.nextUrl.origin}/api/superpaybr/auth`, {
        method: "POST",
      })

      if (!authResponse.ok) {
        throw new Error("Falha na autenticação SuperPayBR")
      }

      const authData = await authResponse.json()
      const accessToken = authData.data?.access_token

      if (!accessToken) {
        throw new Error("Token SuperPayBR não obtido")
      }

      // Consultar fatura na SuperPayBR
      const apiUrl = process.env.SUPERPAY_API_URL
      const invoiceResponse = await fetch(`${apiUrl}/v4/invoices?external_id=${externalId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })

      if (invoiceResponse.ok) {
        const invoiceData = await invoiceResponse.json()
        console.log("📋 Dados da API SuperPayBR:", JSON.stringify(invoiceData, null, 2))

        // Extrair status da resposta
        const invoice = invoiceData.data?.[0] || invoiceData
        const statusCode = invoice?.status?.code || 1
        const amount = invoice?.prices?.total || 0

        // Mapear status
        const statusMapping: Record<
          number,
          {
            name: string
            isPaid: boolean
            isDenied: boolean
            isExpired: boolean
            isCanceled: boolean
            isRefunded: boolean
          }
        > = {
          1: {
            name: "Aguardando Pagamento",
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
          },
          2: {
            name: "Em Análise",
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
          },
          3: {
            name: "Pago Parcialmente",
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
          },
          4: { name: "Negado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
          5: {
            name: "Pagamento Confirmado!",
            isPaid: true,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: false,
          },
          6: {
            name: "Cancelado",
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: true,
            isRefunded: false,
          },
          7: { name: "Vencido", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
          8: {
            name: "Estornado",
            isPaid: false,
            isDenied: false,
            isExpired: false,
            isCanceled: false,
            isRefunded: true,
          },
        }

        const mappedStatus = statusMapping[statusCode] || statusMapping[1]

        return NextResponse.json({
          success: true,
          isPaid: mappedStatus.isPaid,
          isDenied: mappedStatus.isDenied,
          isRefunded: mappedStatus.isRefunded,
          isExpired: mappedStatus.isExpired,
          isCanceled: mappedStatus.isCanceled,
          statusCode: statusCode,
          statusName: mappedStatus.name,
          amount: amount,
          paymentDate: invoice?.payment?.payDate || null,
          timestamp: new Date().toISOString(),
          source: "superpaybr_api",
        })
      }
    } catch (apiErr) {
      console.log("⚠️ Erro ao consultar API SuperPayBR:", apiErr)
    }

    // 4. Se chegou até aqui, retornar status padrão (aguardando)
    console.log("📋 Retornando status padrão (aguardando pagamento)")

    return NextResponse.json({
      success: true,
      isPaid: false,
      isDenied: false,
      isRefunded: false,
      isExpired: false,
      isCanceled: false,
      statusCode: 1,
      statusName: "Aguardando Pagamento",
      amount: 0,
      paymentDate: null,
      timestamp: new Date().toISOString(),
      source: "default",
    })
  } catch (error) {
    console.error("❌ Erro ao consultar status SuperPayBR:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Use GET para consultar status",
    timestamp: new Date().toISOString(),
  })
}
