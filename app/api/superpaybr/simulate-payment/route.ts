import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Importar o storage do webhook
const webhookStorage = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { external_id, status = "paid" } = body

    if (!external_id) {
      return NextResponse.json({ success: false, error: "external_id é obrigatório" }, { status: 400 })
    }

    console.log(`🧪 Simulando pagamento SuperPayBR: ${external_id} - Status: ${status}`)

    // Mapear status para códigos SuperPayBR
    const statusMap: Record<string, { code: number; text: string; title: string }> = {
      paid: { code: 2, text: "paid", title: "Pagamento Confirmado" },
      approved: { code: 2, text: "approved", title: "Pagamento Aprovado" },
      denied: { code: 3, text: "denied", title: "Pagamento Negado" },
      rejected: { code: 3, text: "rejected", title: "Pagamento Rejeitado" },
      expired: { code: 4, text: "expired", title: "Pagamento Vencido" },
      canceled: { code: 5, text: "canceled", title: "Pagamento Cancelado" },
      refunded: { code: 6, text: "refunded", title: "Pagamento Estornado" },
    }

    const statusInfo = statusMap[status] || statusMap.paid

    // Simular dados do webhook
    const webhookData = {
      external_id,
      status: statusInfo,
      amount: 3490, // R$ 34,90 em centavos
      payment_date: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      raw_data: {
        external_id,
        status: statusInfo,
        amount: 3490,
        payment_date: new Date().toISOString(),
        simulated: true,
      },
    }

    // Salvar no storage global
    webhookStorage.set(external_id, webhookData)
    console.log(`💾 Pagamento simulado salvo em memória: ${external_id}`)

    // Backup no Supabase
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

      await supabase.from("superpaybr_webhooks").upsert({
        external_id,
        status_code: statusInfo.code,
        status_text: statusInfo.text,
        status_title: statusInfo.title,
        amount: 3490,
        payment_date: webhookData.payment_date,
        raw_data: webhookData.raw_data,
        created_at: new Date().toISOString(),
      })

      console.log(`💾 Backup Supabase salvo: ${external_id}`)
    } catch (supabaseError) {
      console.error("⚠️ Erro no backup Supabase:", supabaseError)
    }

    return NextResponse.json({
      success: true,
      message: `Pagamento ${status} simulado com sucesso`,
      data: {
        external_id,
        status: statusInfo,
        amount: 3490,
        payment_date: webhookData.payment_date,
        simulated: true,
      },
    })
  } catch (error) {
    console.error("❌ Erro ao simular pagamento SuperPayBR:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
