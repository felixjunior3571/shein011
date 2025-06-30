import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log("🔍 Carregando webhooks SuperPay para debug:", { limit, offset })

    // Verificar se a tabela existe primeiro
    const { data: tableCheck, error: tableError } = await supabase
      .from("payment_webhooks")
      .select("count", { count: "exact", head: true })
      .eq("gateway", "superpay")
      .limit(1)

    if (tableError) {
      console.error("❌ Erro ao verificar tabela payment_webhooks:", tableError)

      // Retornar dados vazios se a tabela não existir
      return NextResponse.json({
        success: true,
        webhooks: [],
        stats: {
          total: 0,
          paid: 0,
          denied: 0,
          expired: 0,
          canceled: 0,
          refunded: 0,
          critical: 0,
          expiredTokens: 0,
          totalAmount: 0,
        },
        pagination: {
          limit,
          offset,
          total: 0,
        },
        message: "Tabela payment_webhooks não encontrada. Execute os scripts SQL primeiro.",
      })
    }

    // Buscar webhooks SuperPay
    const { data: webhooks, error: webhooksError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (webhooksError) {
      console.error("❌ Erro ao buscar webhooks SuperPay:", webhooksError)

      // Retornar dados vazios em caso de erro
      return NextResponse.json({
        success: true,
        webhooks: [],
        stats: {
          total: 0,
          paid: 0,
          denied: 0,
          expired: 0,
          canceled: 0,
          refunded: 0,
          critical: 0,
          expiredTokens: 0,
          totalAmount: 0,
        },
        pagination: {
          limit,
          offset,
          total: 0,
        },
        error: webhooksError.message,
      })
    }

    // Calcular estatísticas
    const { data: statsData, error: statsError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")

    let stats = {
      total: 0,
      paid: 0,
      denied: 0,
      expired: 0,
      canceled: 0,
      refunded: 0,
      critical: 0,
      expiredTokens: 0,
      totalAmount: 0,
    }

    if (!statsError && statsData) {
      stats = {
        total: statsData.length,
        paid: statsData.filter((w) => w.is_paid).length,
        denied: statsData.filter((w) => w.is_denied).length,
        expired: statsData.filter((w) => w.is_expired).length,
        canceled: statsData.filter((w) => w.is_canceled).length,
        refunded: statsData.filter((w) => w.is_refunded).length,
        critical: statsData.filter((w) => w.is_critical).length,
        expiredTokens: statsData.filter((w) => w.expires_at && new Date(w.expires_at) < new Date()).length,
        totalAmount: statsData.reduce((sum, w) => sum + (w.amount || 0), 0),
      }
    }

    console.log("✅ Webhooks SuperPay carregados:", {
      webhooks_count: webhooks?.length || 0,
      stats,
    })

    return NextResponse.json({
      success: true,
      webhooks: webhooks || [],
      stats,
      pagination: {
        limit,
        offset,
        total: stats.total,
      },
    })
  } catch (error) {
    console.error("❌ Erro na API de debug SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
        timestamp: new Date().toISOString(),
        webhooks: [],
        stats: {
          total: 0,
          paid: 0,
          denied: 0,
          expired: 0,
          canceled: 0,
          refunded: 0,
          critical: 0,
          expiredTokens: 0,
          totalAmount: 0,
        },
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "clear_test_data") {
      console.log("🧹 Limpando dados de teste SuperPay...")

      // Deletar dados de teste
      const { error } = await supabase
        .from("payment_webhooks")
        .delete()
        .eq("gateway", "superpay")
        .or("external_id.like.TEST_%,external_id.like.SHEIN_TEST_%")

      if (error) {
        console.error("❌ Erro ao limpar dados de teste:", error)
        throw error
      }

      console.log("✅ Dados de teste SuperPay limpos")

      return NextResponse.json({
        success: true,
        message: "Dados de teste SuperPay removidos com sucesso",
      })
    } else if (action === "clear_expired_tokens") {
      console.log("🧹 Limpando tokens expirados SuperPay...")

      // Deletar tokens expirados
      const { error } = await supabase
        .from("payment_webhooks")
        .delete()
        .eq("gateway", "superpay")
        .lt("expires_at", new Date().toISOString())

      if (error) {
        console.error("❌ Erro ao limpar tokens expirados:", error)
        throw error
      }

      console.log("✅ Tokens expirados SuperPay limpos")

      return NextResponse.json({
        success: true,
        message: "Tokens expirados SuperPay removidos com sucesso",
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Ação não suportada",
          supported_actions: ["clear_test_data", "clear_expired_tokens"],
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("❌ Erro na limpeza SuperPay:", error)

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
