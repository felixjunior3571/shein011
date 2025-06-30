import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Carregando webhooks SuperPay do Supabase...")

    // Verificar se a tabela existe
    const { data: tables, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_name", "payment_webhooks")
      .limit(1)

    if (tableError) {
      console.log("⚠️ Erro ao verificar tabela:", tableError)
    }

    if (!tables || tables.length === 0) {
      console.log("⚠️ Tabela payment_webhooks não encontrada")
      return NextResponse.json({
        success: true,
        message: "Tabela payment_webhooks não encontrada. Execute o script SQL primeiro.",
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
      })
    }

    // Buscar webhooks SuperPay
    const { data: webhooks, error: webhookError } = await supabase
      .from("payment_webhooks")
      .select("*")
      .eq("gateway", "superpay")
      .order("processed_at", { ascending: false })
      .limit(100)

    if (webhookError) {
      console.error("❌ Erro ao buscar webhooks SuperPay:", webhookError)
      throw webhookError
    }

    const webhookList = webhooks || []

    // Calcular estatísticas
    const now = new Date()
    const stats = {
      total: webhookList.length,
      paid: webhookList.filter((w) => w.is_paid).length,
      denied: webhookList.filter((w) => w.is_denied).length,
      expired: webhookList.filter((w) => w.is_expired).length,
      canceled: webhookList.filter((w) => w.is_canceled).length,
      refunded: webhookList.filter((w) => w.is_refunded).length,
      critical: webhookList.filter((w) => w.is_critical).length,
      expiredTokens: webhookList.filter((w) => w.expires_at && new Date(w.expires_at) < now).length,
      totalAmount: webhookList.reduce((sum, w) => sum + (w.amount || 0), 0),
    }

    console.log(`✅ ${webhookList.length} webhooks SuperPay carregados`)

    return NextResponse.json({
      success: true,
      webhooks: webhookList,
      stats: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro na API de debug SuperPay:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
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
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Retornar 200 mesmo com erro para evitar "Failed to fetch"
    )
  }
}
