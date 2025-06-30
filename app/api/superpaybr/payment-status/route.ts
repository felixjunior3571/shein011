import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSuperPayBRPaymentConfirmation } from "@/lib/superpaybr-payment-storage"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("externalId")
    const invoiceId = searchParams.get("invoiceId")
    const token = searchParams.get("token")

    console.log("🔍 Consultando status SuperPayBR:", {
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

    // First, try to get from memory (fastest)
    let memoryConfirmation = null
    if (externalId) {
      memoryConfirmation = getSuperPayBRPaymentConfirmation(externalId)
    } else if (invoiceId) {
      memoryConfirmation = getSuperPayBRPaymentConfirmation(invoiceId)
    } else if (token) {
      memoryConfirmation = getSuperPayBRPaymentConfirmation(token)
    }

    if (memoryConfirmation) {
      console.log("✅ Pagamento SuperPayBR encontrado na memória:", {
        external_id: memoryConfirmation.externalId,
        status: memoryConfirmation.statusName,
        is_paid: memoryConfirmation.isPaid,
      })

      return NextResponse.json({
        success: true,
        found: true,
        data: {
          isPaid: memoryConfirmation.isPaid,
          isDenied: memoryConfirmation.isDenied,
          isExpired: memoryConfirmation.isExpired,
          isCanceled: memoryConfirmation.isCanceled,
          isRefunded: memoryConfirmation.isRefunded,
          statusCode: memoryConfirmation.statusCode,
          statusName: memoryConfirmation.statusName,
          amount: memoryConfirmation.amount,
          paymentDate: memoryConfirmation.paymentDate,
          lastUpdate: memoryConfirmation.receivedAt,
          externalId: memoryConfirmation.externalId,
          invoiceId: memoryConfirmation.invoiceId,
          source: "memory",
        },
      })
    }

    // If not found in memory, try Supabase
    let query = supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpaybr")
      .order("processed_at", { ascending: false })

    // Add search conditions
    if (externalId) {
      query = query.eq("external_id", externalId)
    } else if (invoiceId) {
      query = query.eq("invoice_id", invoiceId)
    } else if (token) {
      query = query.or(`external_id.eq.${token},invoice_id.eq.${token}`)
    }

    const { data: records, error } = await query.limit(1)

    if (error) {
      console.error("❌ Erro na consulta Supabase SuperPayBR:", error)
      throw error
    }

    const record = records?.[0]

    if (!record) {
      console.log("❌ Pagamento SuperPayBR não encontrado")
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
          source: "not_found",
        },
      })
    }

    console.log("✅ Pagamento SuperPayBR encontrado no Supabase:", {
      id: record.id,
      external_id: record.external_id,
      status: record.status_name,
      is_paid: record.is_paid,
    })

    // Return standardized response
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
        webhookData: record.webhook_data,
        source: "supabase",
      },
    }

    console.log("📤 Resposta da consulta SuperPayBR:", {
      external_id: response.data.externalId,
      is_paid: response.data.isPaid,
      status: response.data.statusName,
      source: response.data.source,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("❌ Erro na API de status SuperPayBR:", error)

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

    console.log("🔍 Consulta em lote SuperPayBR:", externalIds)

    // Try memory first for all IDs
    const memoryResults = externalIds.map((externalId) => {
      const confirmation = getSuperPayBRPaymentConfirmation(externalId)
      return confirmation
        ? { externalId, confirmation, source: "memory" }
        : { externalId, confirmation: null, source: "not_found" }
    })

    const foundInMemory = memoryResults.filter((r) => r.confirmation)
    const notFoundInMemory = memoryResults.filter((r) => !r.confirmation).map((r) => r.externalId)

    console.log(`📊 Memória SuperPayBR: ${foundInMemory.length}/${externalIds.length} encontrados`)

    // Query Supabase for missing records
    let supabaseResults: any[] = []
    if (notFoundInMemory.length > 0) {
      const { data: records, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpaybr")
        .in("external_id", notFoundInMemory)
        .order("processed_at", { ascending: false })

      if (error) {
        console.error("❌ Erro na consulta em lote Supabase SuperPayBR:", error)
        throw error
      }

      supabaseResults = records || []
      console.log(`📊 Supabase SuperPayBR: ${supabaseResults.length}/${notFoundInMemory.length} encontrados`)
    }

    // Map results
    const results = externalIds.map((externalId) => {
      // Check memory first
      const memoryResult = memoryResults.find((r) => r.externalId === externalId)
      if (memoryResult?.confirmation) {
        const conf = memoryResult.confirmation
        return {
          externalId: conf.externalId,
          found: true,
          isPaid: conf.isPaid,
          isDenied: conf.isDenied,
          isExpired: conf.isExpired,
          isCanceled: conf.isCanceled,
          isRefunded: conf.isRefunded,
          statusCode: conf.statusCode,
          statusName: conf.statusName,
          amount: conf.amount,
          paymentDate: conf.paymentDate,
          lastUpdate: conf.receivedAt,
          invoiceId: conf.invoiceId,
          source: "memory",
        }
      }

      // Check Supabase
      const supabaseRecord = supabaseResults.find((r) => r.external_id === externalId)
      if (supabaseRecord) {
        return {
          externalId: supabaseRecord.external_id,
          found: true,
          isPaid: supabaseRecord.is_paid || false,
          isDenied: supabaseRecord.is_denied || false,
          isExpired: supabaseRecord.is_expired || false,
          isCanceled: supabaseRecord.is_canceled || false,
          isRefunded: supabaseRecord.is_refunded || false,
          statusCode: supabaseRecord.status_code,
          statusName: supabaseRecord.status_name,
          amount: supabaseRecord.amount || 0,
          paymentDate: supabaseRecord.payment_date,
          lastUpdate: supabaseRecord.processed_at,
          invoiceId: supabaseRecord.invoice_id,
          source: "supabase",
        }
      }

      // Not found
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
        source: "not_found",
      }
    })

    console.log(
      `✅ Consulta em lote SuperPayBR concluída: ${results.filter((r) => r.found).length}/${externalIds.length} encontrados`,
    )

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: externalIds.length,
        found: results.filter((r) => r.found).length,
        paid: results.filter((r) => r.isPaid).length,
        memory_hits: foundInMemory.length,
        supabase_hits: supabaseResults.length,
      },
    })
  } catch (error) {
    console.error("❌ Erro na consulta em lote SuperPayBR:", error)

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
