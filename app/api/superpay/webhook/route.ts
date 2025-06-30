import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPay recebido")

    // Parse do payload
    const payload = await request.json()
    console.log("📦 Payload completo:", JSON.stringify(payload, null, 2))

    // Validar estrutura do payload
    if (!payload.invoices || !payload.invoices.external_id || !payload.invoices.status) {
      console.error("❌ Payload inválido - campos obrigatórios ausentes")
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const invoice = payload.invoices
    const externalId = invoice.external_id
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const statusDescription = invoice.status.description
    const paymentDate = invoice.payment?.payDate || invoice.date
    const gateway = invoice.payment?.gateway
    const payId = invoice.payment?.payId

    console.log(`🔍 Processando fatura: ${externalId}`)
    console.log(`📊 Status: ${statusCode} - ${statusTitle}`)
    console.log(`💳 Gateway: ${gateway} | PayID: ${payId}`)

    // Mapear status code para status legível
    const statusMap = {
      1: "pendente",
      2: "processando",
      3: "aguardando",
      4: "em_analise",
      5: "pago", // ✅ PAGAMENTO CONFIRMADO
      6: "recusado", // ❌ RECUSADO
      7: "cancelado", // ❌ CANCELADO
      8: "estornado", // ❌ ESTORNADO
      9: "vencido", // ❌ VENCIDO
      10: "contestado", // ❌ CONTESTADO
    }

    const newStatus = statusMap[statusCode] || "desconhecido"
    console.log(`🔄 Mapeando status ${statusCode} → ${newStatus}`)

    // Buscar fatura no Supabase pelo external_id
    const { data: existingInvoice, error: fetchError } = await supabase
      .from("faturas")
      .select("*")
      .eq("external_id", externalId)
      .single()

    if (fetchError) {
      console.error("❌ Erro ao buscar fatura:", fetchError)
      return NextResponse.json({ error: "Fatura não encontrada" }, { status: 404 })
    }

    console.log(`📋 Fatura encontrada: ID ${existingInvoice.id} | Status atual: ${existingInvoice.status}`)
    console.log(`🎯 Tipo de redirecionamento: ${existingInvoice.redirect_type}`)

    // Preparar dados para atualização
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      superpay_status_code: statusCode,
      superpay_status_title: statusTitle,
      superpay_status_description: statusDescription,
      gateway: gateway,
      pay_id: payId,
    }

    // Se pagamento confirmado, adicionar paid_at
    if (statusCode === 5) {
      updateData.paid_at = paymentDate
      console.log("✅ PAGAMENTO CONFIRMADO! Marcando paid_at:", paymentDate)

      // Determinar redirecionamento baseado no tipo
      if (existingInvoice.redirect_type === "checkout") {
        console.log("🚀 Tipo CHECKOUT - Cliente será redirecionado para /upp/001")
      } else if (existingInvoice.redirect_type === "activation") {
        console.log("🚀 Tipo ACTIVATION - Cliente será redirecionado para /upp10")
      }
    }

    // Atualizar fatura no Supabase
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("faturas")
      .update(updateData)
      .eq("external_id", externalId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Erro ao atualizar fatura:", updateError)
      return NextResponse.json({ error: "Erro ao atualizar fatura" }, { status: 500 })
    }

    console.log("✅ Fatura atualizada com sucesso:", updatedInvoice)

    // Log específico para diferentes status
    switch (statusCode) {
      case 5:
        console.log("🎉 PAGAMENTO CONFIRMADO! Cliente pode ser redirecionado")
        break
      case 6:
        console.log("❌ PAGAMENTO RECUSADO")
        break
      case 7:
        console.log("❌ PAGAMENTO CANCELADO")
        break
      case 8:
        console.log("❌ PAGAMENTO ESTORNADO")
        break
      case 9:
        console.log("❌ PAGAMENTO VENCIDO")
        break
      default:
        console.log(`ℹ️ Status ${statusCode}: ${statusTitle}`)
    }

    // Resposta de sucesso para SuperPay
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      status: newStatus,
      redirect_type: existingInvoice.redirect_type,
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 Erro no webhook SuperPay:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json(
    {
      error: "Método não permitido",
      message: "Este endpoint aceita apenas POST",
    },
    { status: 405 },
  )
}
