import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook SuperPayBR recebido")

    // Parse do payload
    const payload = await request.json()
    console.log("📦 Payload completo:", JSON.stringify(payload, null, 2))

    // Validar estrutura do payload SuperPayBR
    if (!payload.invoices || !payload.invoices.external_id || !payload.invoices.status) {
      console.error("❌ Payload inválido - campos obrigatórios ausentes")
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 })
    }

    const invoice = payload.invoices
    const externalId = invoice.external_id
    const statusCode = invoice.status.code
    const statusTitle = invoice.status.title
    const statusDescription = invoice.status.description
    const paymentDate = invoice.payment?.payDate || invoice.date || new Date().toISOString()
    const gateway = invoice.payment?.gateway || "pix"
    const payId = invoice.payment?.payId
    const amount = invoice.prices?.total || 0

    console.log(`🔍 Processando fatura SuperPayBR: ${externalId}`)
    console.log(`📊 Status: ${statusCode} - ${statusTitle}`)
    console.log(`💰 Valor: R$ ${(amount / 100).toFixed(2)}`)
    console.log(`💳 Gateway: ${gateway} | PayID: ${payId}`)

    // Mapear status code SuperPayBR para status legível
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
    console.log(`🎯 Tipo de redirecionamento: ${existingInvoice.redirect_type || "checkout"}`)

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

    // Se pagamento confirmado, adicionar paid_at e processar redirecionamento
    if (statusCode === 5) {
      updateData.paid_at = paymentDate
      console.log("✅ PAGAMENTO CONFIRMADO! Marcando paid_at:", paymentDate)

      // Determinar URL de redirecionamento baseado no tipo
      const redirectType = existingInvoice.redirect_type || "checkout"
      let redirectUrl = "/upp/001" // default para checkout

      if (redirectType === "checkout") {
        redirectUrl = "/upp/001"
        console.log("🚀 Tipo CHECKOUT - Cliente será redirecionado para /upp/001")
      } else if (redirectType === "activation") {
        redirectUrl = "/upp10"
        console.log("🚀 Tipo ACTIVATION - Cliente será redirecionado para /upp10")
      }

      // Criar notificação de redirecionamento no localStorage via webhook data
      const webhookNotification = {
        external_id: externalId,
        status: "paid",
        redirect_url: redirectUrl,
        redirect_type: redirectType,
        payment_confirmed: true,
        amount: amount / 100,
        paid_at: paymentDate,
        gateway: gateway,
        pay_id: payId,
        webhook_received_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
      }

      // Salvar notificação de webhook para o frontend
      const { error: notificationError } = await supabase
        .from("webhook_notifications")
        .upsert(webhookNotification, { onConflict: "external_id" })

      if (notificationError) {
        console.error("❌ Erro ao salvar notificação:", notificationError)
      } else {
        console.log("✅ Notificação de webhook salva para external_id:", externalId)
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

    // Enviar notificação para callback URL se fornecida
    if (existingInvoice.callback_url) {
      try {
        console.log(`📞 Enviando notificação para callback: ${existingInvoice.callback_url}`)

        const callbackPayload = {
          external_id: externalId,
          status: newStatus,
          status_code: statusCode,
          status_title: statusTitle,
          amount: amount / 100,
          paid_at: statusCode === 5 ? paymentDate : null,
          gateway: gateway,
          pay_id: payId,
          redirect_type: existingInvoice.redirect_type || "checkout",
          webhook_timestamp: new Date().toISOString(),
        }

        const callbackResponse = await fetch(existingInvoice.callback_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "SuperPayBR-Webhook/1.0",
          },
          body: JSON.stringify(callbackPayload),
          signal: AbortSignal.timeout(10000), // 10 segundos timeout
        })

        if (callbackResponse.ok) {
          console.log("✅ Callback enviado com sucesso")
        } else {
          console.log(`⚠️ Callback retornou status ${callbackResponse.status}`)
        }
      } catch (callbackError) {
        console.error("❌ Erro ao enviar callback:", callbackError)
        // Não falhar o webhook por erro de callback
      }
    }

    // Log específico para diferentes status
    switch (statusCode) {
      case 5:
        console.log("🎉 PAGAMENTO CONFIRMADO! Sistema de redirecionamento ativado")
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

    // Resposta de sucesso para SuperPayBR
    return NextResponse.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: externalId,
      status: newStatus,
      redirect_type: existingInvoice.redirect_type || "checkout",
      processed_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("💥 Erro no webhook SuperPayBR:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        message: error instanceof Error ? error.message : "Erro desconhecido",
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
