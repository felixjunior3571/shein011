import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date() > new Date(expiresAt)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("🔍 Consultando status SuperPay:", {
      externalId,
      invoiceId,
      token,
    })

    if (!externalId && !invoiceId && !token) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro obrigatório: externalId, invoiceId ou token",
        },
        { status: 400 },
      )
    }

    // Construir query para Supabase
    let query = supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })

    // Adicionar condições de busca
    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    } else if (token) {
      query = query.eq("token", token)
    }

    const { data: records, error } = await query.limit(1)

    if (error) {
      console.error("❌ Erro na consulta Supabase SuperPay:", error)
      throw error
    }

    const record = records?.[0]

    if (!record) {
      console.log("❌ Pagamento SuperPay não encontrado no Supabase")
      return NextResponse.json({
        success: true,
        found: false,
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: null,
          statusName: "Não encontrado",
          amount: 0,
          paymentDate: null,
          lastUpdate: new Date().toISOString(),
          source: "supabase_only",
        },
      })
    }

    // Verificar se token expirou
    if (record.expires_at && isTokenExpired(record.expires_at)) {
      console.log("⏰ Token SuperPay expirado no Supabase:", {
        external_id: record.external_id,
        expires_at: record.expires_at,
      })

      return NextResponse.json({
        success: true,
        found: false,
        data: {
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: null,
          statusName: "Token expirado",
          amount: 0,
          paymentDate: null,
          lastUpdate: new Date().toISOString(),
          source: "token_expired",
          error: "Token de verificação expirado (15 minutos)",
        },
      })
    }

    console.log("✅ Pagamento SuperPay encontrado no Supabase:", {
      id: record.id,
      external_id: record.external_id,
      status: record.status_name,
      is_paid: record.is_paid,
      token: record.token,
      expires_at: record.expires_at,
    })

    // Retornar resposta padronizada
    const response = {
      success: true,
      found: true,
      data: {
        isPaid: record.is_paid || false,
        isDenied: record.is_denied || false,
        isExpired: record.is_expired || false,
        isCanceled: record.is_canceled || false,
        isRefunded: record.is_refunded || false,
        statusCode: record.status_code,
        statusName: record.status_name,
        amount: record.amount || 0,
        paymentDate: record.payment_date,
        lastUpdate: record.processed_at,
        externalId: record.external_id,
        invoiceId: record.invoice_id,
        token: record.token,
        expiresAt: record.expires_at,
        webhookData: record.webhook_data,
        source: "supabase",
      },
    }

    console.log("📤 Resposta da consulta SuperPay:", {
      external_id: response.data.externalId,
      is_paid: response.data.isPaid,
      status: response.data.statusName,
      token: response.data.token,
      source: response.data.source,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro na API de status SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { externalIds } = body

    if (!Array.isArray(externalIds) || externalIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Array de externalIds é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log("🔍 Consulta em lote SuperPay no Supabase:", externalIds)

    // Query multiple records from Supabase
    const { data: records, error } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .in("external_id", externalIds)
      .order("processed_at", { ascending: false })

    if (error) {
      console.error("❌ Erro na consulta em lote Supabase:", error)
      throw error
    }

    // Map results
    const results = externalIds.map((externalId) => {
      const record = records?.find((r) => r.external_id === externalId)

      if (!record) {
        return {
          externalId,
          found: false,
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: null,
          statusName: "Não encontrado",
          amount: 0,
          paymentDate: null,
          lastUpdate: new Date().toISOString(),
          source: "supabase_only",
        }
      }

      // Verificar se token expirou
      if (record.expires_at && isTokenExpired(record.expires_at)) {
        return {
          externalId: record.external_id,
          found: false,
          isPaid: false,
          isDenied: false,
          isExpired: false,
          isCanceled: false,
          isRefunded: false,
          statusCode: null,
          statusName: "Token expirado",
          amount: 0,
          paymentDate: null,
          lastUpdate: new Date().toISOString(),
          token: record.token,
          expiresAt: record.expires_at,
          source: "token_expired",
        }
      }

      return {
        externalId: record.external_id,
        found: true,
        isPaid: record.is_paid || false,
        isDenied: record.is_denied || false,
        isExpired: record.is_expired || false,
        isCanceled: record.is_canceled || false,
        isRefunded: record.is_refunded || false,
        statusCode: record.status_code,
        statusName: record.status_name,
        amount: record.amount || 0,
        paymentDate: record.payment_date,
        lastUpdate: record.processed_at,
        invoiceId: record.invoice_id,
        token: record.token,
        expiresAt: record.expires_at,
        source: "supabase",
      }
    })

    console.log(
      `✅ Consulta em lote SuperPay concluída: ${results.filter((r) => r.found).length}/${externalIds.length} encontrados`,
    )

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: externalIds.length,
        found: results.filter((r) => r.found).length,
        paid: results.filter((r) => r.isPaid).length,
        source: "supabase_only",
      },
    })
  } catch (error) {
    console.error("❌ Erro na consulta em lote SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
