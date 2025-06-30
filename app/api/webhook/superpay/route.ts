import { type NextRequest, NextResponse } from "next/server"
import { updateFaturaStatus, getFaturaByExternalId } from "@/lib/supabase"
import { mapStatusCode } from "@/utils/status-mapper"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("🔔 Webhook SuperPay recebido:", {
      external_id: body.external_id,
      status_code: body.status?.code,
      invoice_id: body.id,
    })

    // Validações básicas
    if (!body.external_id || !body.status?.code) {
      console.error("❌ Webhook inválido - dados obrigatórios ausentes")
      return NextResponse.json({ success: false, error: "Dados obrigatórios ausentes" }, { status: 400 })
    }

    const { external_id, status } = body
    const statusCode = status.code
    const newStatus = mapStatusCode(statusCode)

    // Verificar se a fatura existe
    const fatura = await getFaturaByExternalId(external_id)
    if (!fatura) {
      console.error("❌ Fatura não encontrada:", external_id)
      return NextResponse.json({ success: false, error: "Fatura não encontrada" }, { status: 404 })
    }

    // Atualizar status no Supabase
    const updatedFatura = await updateFaturaStatus(external_id, newStatus)

    console.log("✅ Status atualizado:", {
      external_id,
      old_status: fatura.status,
      new_status: newStatus,
      status_code: statusCode,
    })

    // Log específico para pagamentos confirmados
    if (newStatus === "pago") {
      console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK!", {
        external_id,
        amount: fatura.amount,
        customer: fatura.customer_name,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        external_id,
        old_status: fatura.status,
        new_status: newStatus,
        updated_at: updatedFatura.updated_at,
      },
    })
  } catch (error) {
    console.error("❌ Erro no webhook SuperPay:", error)

    // Sempre retornar 200 para evitar reenvios do webhook
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro interno",
    })
  }
}
