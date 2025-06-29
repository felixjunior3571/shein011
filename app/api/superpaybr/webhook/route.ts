import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 === WEBHOOK SUPERPAYBR RECEBIDO ===")

    const body = await request.json()
    console.log("📥 Payload completo:", JSON.stringify(body, null, 2))

    const { invoices } = body

    if (!invoices?.status?.code || !invoices.external_id) {
      console.error("❌ Payload inválido - dados obrigatórios ausentes")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const statusCode = invoices.status.code
    const externalId = invoices.external_id

    console.log(`📊 Status recebido: ${statusCode} para ${externalId}`)

    const paymentData = {
      external_id: externalId,
      invoice_id: invoices.id,
      token: invoices.token,
      amount: invoices.prices?.total || 0,
      status_code: statusCode,
      status_text: invoices.status.title,
      payment_date: invoices.payment?.payDate || null,
      is_paid: statusCode === 5,
      is_refunded: statusCode === 9,
      is_denied: statusCode === 12,
      is_expired: statusCode === 15,
      is_canceled: statusCode === 6,
      updated_at: new Date().toISOString(),
    }

    console.log("💾 Salvando no Supabase:", paymentData)

    // UPSERT para manter atualizado
    const { data, error } = await supabase.from("payments").upsert(paymentData, { onConflict: "external_id" })

    if (error) {
      console.error("❌ Erro ao salvar no Supabase:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    console.log("✅ Webhook processado com sucesso")

    // Log do status para debug
    if (statusCode === 5) {
      console.log("🎉 PAGAMENTO CONFIRMADO!")
    } else if (statusCode === 12) {
      console.log("❌ PAGAMENTO NEGADO")
    } else if (statusCode === 15) {
      console.log("⏰ PAGAMENTO VENCIDO")
    }

    return NextResponse.json({ success: true, message: "Webhook processed" })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPayBR:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  )
}
