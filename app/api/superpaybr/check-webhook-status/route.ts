import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { activeNotifications } from "../webhook/route"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Verificação rápida para: ${externalId}`)

    // 1. PRIMEIRO: Verificar cache em memória (mais rápido)
    const cachedNotification = activeNotifications.get(externalId)
    if (cachedNotification) {
      console.log(`⚡ Notificação encontrada no cache: ${externalId}`)

      // Verificar se não expirou
      const now = new Date()
      const expiresAt = new Date(cachedNotification.expires_at)

      if (now <= expiresAt) {
        return NextResponse.json({
          success: true,
          data: {
            external_id: cachedNotification.external_id,
            status: cachedNotification.status,
            payment_confirmed: cachedNotification.payment_confirmed,
            redirect_url: cachedNotification.redirect_url,
            redirect_type: cachedNotification.redirect_type,
            amount: cachedNotification.amount,
            paid_at: cachedNotification.paid_at,
            gateway: cachedNotification.gateway,
            pay_id: cachedNotification.pay_id,
            last_update: cachedNotification.webhook_received_at,
            source: "memory_cache",
          },
        })
      } else {
        // Remover do cache se expirou
        activeNotifications.delete(externalId)
        console.log(`⏰ Notificação expirada removida do cache: ${externalId}`)
      }
    }

    // 2. SEGUNDO: Verificar banco de dados (webhook_notifications)
    const { data: notification, error: notificationError } = await supabase
      .from("webhook_notifications")
      .select("*")
      .eq("external_id", externalId)
      .order("webhook_received_at", { ascending: false })
      .limit(1)
      .single()

    if (!notificationError && notification) {
      // Verificar se a notificação não expirou
      const now = new Date()
      const expiresAt = new Date(notification.expires_at)

      if (now <= expiresAt) {
        console.log(`📋 Notificação encontrada no banco: ${externalId}`)

        // Adicionar ao cache para próximas consultas
        activeNotifications.set(externalId, notification)

        return NextResponse.json({
          success: true,
          data: {
            external_id: notification.external_id,
            status: notification.status,
            payment_confirmed: notification.payment_confirmed,
            redirect_url: notification.redirect_url,
            redirect_type: notification.redirect_type,
            amount: notification.amount,
            paid_at: notification.paid_at,
            gateway: notification.gateway,
            pay_id: notification.pay_id,
            last_update: notification.webhook_received_at,
            source: "database_cache",
          },
        })
      } else {
        // Remover notificação expirada
        await supabase.from("webhook_notifications").delete().eq("external_id", externalId)
        console.log(`⏰ Notificação expirada removida do banco: ${externalId}`)
      }
    }

    // 3. TERCEIRO: Verificar tabela de faturas (fallback)
    const { data: invoice, error: invoiceError } = await supabase
      .from("faturas")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (invoiceError) {
      console.error("❌ Erro ao buscar fatura:", invoiceError)
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
    }

    console.log(`📄 Consultando fatura diretamente: ${externalId} - Status: ${invoice.status}`)

    return NextResponse.json({
      success: true,
      data: {
        external_id: externalId,
        status: invoice.status || "pendente",
        payment_confirmed: invoice.status === "pago",
        redirect_url:
          invoice.status === "pago" ? (invoice.redirect_type === "activation" ? "/upp10" : "/upp/001") : null,
        redirect_type: invoice.redirect_type || "checkout",
        amount: invoice.amount || 0,
        paid_at: invoice.paid_at,
        last_update: invoice.updated_at,
        source: "database_direct",
      },
    })
  } catch (error) {
    console.error("💥 Erro ao verificar status webhook:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
