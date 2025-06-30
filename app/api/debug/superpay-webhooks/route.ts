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

    // Buscar webhooks SuperPay
    const { data: webhooks, error: webhooksError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (webhooksError) {
      console.error("❌ Erro ao buscar webhooks SuperPay:", webhooksError)
      throw webhooksError
    }

    // Calcular estatísticas
    const { data: statsData, error: statsError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")

    if (statsError) {
      console.error("❌ Erro ao calcular estatísticas SuperPay:", statsError)
      throw statsError
    }

    const stats = {
      total: statsData?.length || 0,
      paid: statsData?.filter((w) => w.is_paid).length || 0,
      denied: statsData?.filter((w) => w.is_denied).length || 0,
      expired: statsData?.filter((w) => w.is_expired).length || 0,
      canceled: statsData?.filter((w) => w.is_canceled).length || 0,
      refunded: statsData?.filter((w) => w.is_refunded).length || 0,
      critical: statsData?.filter((w) => w.is_critical).length || 0,
      expiredTokens: statsData?.filter((w) => w.expires_at && new Date(w.expires_at) < new Date()).length || 0,
      totalAmount: statsData?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0,
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
