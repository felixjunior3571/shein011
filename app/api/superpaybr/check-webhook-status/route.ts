import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const externalId = searchParams.get("external_id")

    if (!externalId) {
      return NextResponse.json({ error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🔍 Verificando status webhook para: ${externalId}`)

    // Buscar notificação de webhook mais recente
    const { data: notification, error: notificationError } = await supabase
      .from("webhook_notifications")
      .select("*")
      .eq("external_id", externalId)
      .order("webhook_received_at", { ascending: false })
      .limit(1)
      .single()

    if (notificationError && notificationError.code !== "PGRST116") {
      console.error("❌ Erro ao buscar notificação:", notificationError)
      return NextResponse.json({ error: "Erro ao buscar notificação" }, { status: 500 })
    }

    // Se não há notificação, buscar na tabela de faturas
    if (!notification) {
      console.log("📋 Nenhuma notificação encontrada, verificando fatura...")

      const { data: invoice, error: invoiceError } = await supabase
        .from("faturas")
        .select("*")
        .eq("external_id", externalId)
        .single()

      if (invoiceError) {
        console.error("❌ Erro ao buscar fatura:", invoiceError)
        return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
      }

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
          source: "database",
        },
      })
    }

    // Verificar se a notificação não expirou
    const now = new Date()
    const expiresAt = new Date(notification.expires_at)

    if (now > expiresAt) {
      console.log("⏰ Notificação expirada, removendo...")

      await supabase.from("webhook_notifications").delete().eq("external_id", externalId)

      return NextResponse.json({
        success: true,
        data: {
          external_id: externalId,
          status: "pendente",
          payment_confirmed: false,
          redirect_url: null,
          redirect_type: notification.redirect_type || "checkout",
          amount: notification.amount || 0,
          paid_at: null,
          last_update: new Date().toISOString(),
          source: "expired",
        },
      })
    }

    console.log("✅ Notificação encontrada:", notification)

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
        source: "webhook",
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
