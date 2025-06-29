import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("🔔 Webhook SuperPayBR recebido:", JSON.stringify(body, null, 2))

    // Extrair dados do webhook
    const externalId = body.external_id || body.invoice_id || body.id
    const status = body.status || {}
    const amount = body.amount || body.value || 0

    if (!externalId) {
      console.log("⚠️ External ID não encontrado no webhook SuperPayBR")
      return NextResponse.json({ success: true, message: "External ID não encontrado" })
    }

    // Mapear status SuperPayBR
    const isPaid = status.code === 5 || status.text === "paid" || body.paid === true
    const isDenied = status.code === 6 || status.text === "denied" || body.denied === true
    const isExpired = status.code === 7 || status.text === "expired" || body.expired === true
    const isCanceled = status.code === 8 || status.text === "canceled" || body.canceled === true
    const isRefunded = status.code === 9 || status.text === "refunded" || body.refunded === true

    const paymentData = {
      isPaid,
      isDenied,
      isExpired,
      isCanceled,
      isRefunded,
      statusCode: status.code || 1,
      statusName: status.title || status.text || "pending",
      amount: typeof amount === "number" ? amount / 100 : 0, // Converter de centavos
      paymentDate: isPaid ? new Date().toISOString() : null,
      webhook_data: body,
    }

    console.log("💾 Salvando webhook SuperPayBR:", {
      externalId,
      isPaid,
      statusCode: paymentData.statusCode,
      statusName: paymentData.statusName,
    })

    // Salvar no Supabase
    const { error } = await supabase.from("payment_webhooks").upsert(
      {
        external_id: externalId,
        payment_data: paymentData,
        provider: "superpaybr",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "external_id",
      },
    )

    if (error) {
      console.error("❌ Erro ao salvar webhook SuperPayBR:", error)
      // ⚠️ NÃO retornar erro 500 para não afetar o webhook
      return NextResponse.json({ success: true, message: "Erro interno, mas webhook processado" })
    }

    console.log("✅ Webhook SuperPayBR processado com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Webhook SuperPayBR processado",
      data: {
        external_id: externalId,
        status: paymentData.statusName,
        is_paid: isPaid,
      },
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)
    // ⚠️ NÃO retornar erro 500 para não afetar o webhook
    return NextResponse.json({ success: true, message: "Erro processado" })
  }
}
