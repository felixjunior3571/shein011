import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSuperPayPaymentConfirmation, isTokenExpired } from "@/lib/superpay-payment-storage"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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

    // Primeiro, tentar obter da memória (mais rápido)
    let memoryConfirmation = null
    if (externalId) {
      memoryConfirmation = getSuperPayPaymentConfirmation(externalId)
    } else if (invoiceId) {
      memoryConfirmation = getSuperPayPaymentConfirmation(invoiceId)
    } else if (token) {
      memoryConfirmation = getSuperPayPaymentConfirmation(token)
    }

    if (memoryConfirmation) {
      // Verificar se token não expirou
      if (isTokenExpired(memoryConfirmation.expiresAt)) {
        console.log("⏰ Token SuperPay expirado na memória:", {
          external_id: memoryConfirmation.externalId,
          expires_at: memoryConfirmation.expiresAt,
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

      console.log("✅ Pagamento SuperPay encontrado na memória:", {
        external_id: memoryConfirmation.externalId,
        status: memoryConfirmation.statusName,
        is_paid: memoryConfirmation.isPaid,
        token: memoryConfirmation.token,
        expires_at: memoryConfirmation.expiresAt,
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
          token: memoryConfirmation.token,
          expiresAt: memoryConfirmation.expiresAt,
          source: "memory",
        },
      })
    }

    // Se não encontrado na memória, tentar Supabase
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
      console.log("❌ Pagamento SuperPay não encontrado")
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

    // Verificar se token expirou no Supabase
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

    console.log("🔍 Consulta em lote SuperPay:", externalIds)

    // Tentar memória primeiro para todos os IDs
    const memoryResults = externalIds.map((externalId) => {
      const confirmation = getSuperPayPaymentConfirmation(externalId)
      return confirmation
        ? { externalId, confirmation, source: "memory" }
        : { externalId, confirmation: null, source: "not_found" }
    })

    const foundInMemory = memoryResults.filter((r) => r.confirmation)
    const notFoundInMemory = memoryResults.filter((r) => !r.confirmation).map((r) => r.externalId)

    console.log(`📊 Memória SuperPay: ${foundInMemory.length}/${externalIds.length} encontrados`)

    // Consultar Supabase para registros não encontrados
    let supabaseResults: any[] = []
    if (notFoundInMemory.length > 0) {
      const { data: records, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("gateway", "superpay")
        .in("external_id", notFoundInMemory)
        .order("processed_at", { ascending: false })

      if (error) {
        console.error("❌ Erro na consulta em lote Supabase SuperPay:", error)
        throw error
      }

      supabaseResults = records || []
      console.log(`📊 Supabase SuperPay: ${supabaseResults.length}/${notFoundInMemory.length} encontrados`)
    }

    // Mapear resultados
    const results = externalIds.map((externalId) => {
      // Verificar memória primeiro
      const memoryResult = memoryResults.find((r) => r.externalId === externalId)
      if (memoryResult?.confirmation) {
        const conf = memoryResult.confirmation

        // Verificar se token expirou
        if (isTokenExpired(conf.expiresAt)) {
          return {
            externalId: conf.externalId,
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
            token: conf.token,
            expiresAt: conf.expiresAt,
            source: "token_expired",
          }
        }

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
          token: conf.token,
          expiresAt: conf.expiresAt,
          source: "memory",
        }
      }

      // Verificar Supabase
      const supabaseRecord = supabaseResults.find((r) => r.external_id === externalId)
      if (supabaseRecord) {
        // Verificar se token expirou
        if (supabaseRecord.expires_at && isTokenExpired(supabaseRecord.expires_at)) {
          return {
            externalId: supabaseRecord.external_id,
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
            token: supabaseRecord.token,
            expiresAt: supabaseRecord.expires_at,
            source: "token_expired",
          }
        }

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
          token: supabaseRecord.token,
          expiresAt: supabaseRecord.expires_at,
          source: "supabase",
        }
      }

      // Não encontrado
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
      `✅ Consulta em lote SuperPay concluída: ${results.filter((r) => r.found).length}/${externalIds.length} encontrados`,
    )

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: externalIds.length,
        found: results.filter((r) => r.found).length,
        paid: results.filter((r) => r.isPaid).length,
        expired_tokens: results.filter((r) => r.source === "token_expired").length,
        memory_hits: foundInMemory.length,
        supabase_hits: supabaseResults.length,
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
