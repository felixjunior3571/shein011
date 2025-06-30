import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { activeNotifications } from "../webhook/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json(
        {
          success: false,
          error: "external_id é obrigatório",
        },
        { status: 400 },
      )
    }

    console.log(`🔍 Verificando status do pagamento: ${externalId}`)

    // 1. Verificar cache em memória primeiro (mais rápido)
    const cachedNotification = activeNotifications.get(externalId)
    if (cachedNotification) {
      console.log(`⚡ Encontrado no cache: ${externalId} - ${cachedNotification.status}`)
      return NextResponse.json({
        success: true,
        data: {
          ...cachedNotification,
          source: "memory_cache",
        },
      })
    }

    // 2. Verificar no banco de dados
    console.log(`🔍 Buscando no banco: ${externalId}`)

    const { data: webhookData, error } = await supabase
      .from("webhook_notifications")
      .select("*")
      .eq("external_id", externalId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found
      console.error(`❌ Erro na consulta: ${error.message}`)
      return NextResponse.json(
        {
          success: false,
          error: "Erro na consulta ao banco de dados",
        },
        { status: 500 },
      )
    }

    if (webhookData) {
      console.log(`📊 Encontrado no banco: ${externalId} - ${webhookData.status}`)

      // Adicionar ao cache para próximas consultas
      const cacheData = {
        external_id: webhookData.external_id,
        payment_confirmed: webhookData.payment_confirmed,
        status: webhookData.status,
        redirect_url: webhookData.redirect_url,
        redirect_type: webhookData.redirect_type,
        amount: webhookData.amount,
        paid_at: webhookData.paid_at,
        gateway: webhookData.gateway,
        pay_id: webhookData.pay_id,
        webhook_received_at: webhookData.webhook_received_at,
        last_update: webhookData.last_update,
      }

      activeNotifications.set(externalId, cacheData)

      return NextResponse.json({
        success: true,
        data: {
          ...cacheData,
          source: "database_cache",
        },
      })
    }

    // 3. Não encontrado
    console.log(`❌ Pagamento não encontrado: ${externalId}`)
    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        payment_confirmed: false,
        status: "pending",
        redirect_url: null,
        redirect_type: "checkout",
        amount: 0,
        paid_at: null,
        gateway: "superpaybr",
        pay_id: null,
        webhook_received_at: null,
        last_update: new Date().toISOString(),
        source: "database_direct",
      },
    })
  } catch (error) {
    console.error("💥 Erro ao verificar status:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
