const express = require("express")
const router = express.Router()
const supabase = require("../supabaseClient")
const { mapStatus, isPaid } = require("../utils/statusMap")

/**
 * POST /webhook/superpay
 * Recebe webhooks da SuperPayBR com atualizações de status
 */
router.post("/", async (req, res) => {
  try {
    const webhookData = req.body

    console.log("🔔 Webhook recebido da SuperPay:", JSON.stringify(webhookData, null, 2))

    // Extrair dados do webhook
    const { external_id, status: statusCode, id: invoiceId, amount, paid_at } = webhookData

    if (!external_id || statusCode === undefined) {
      console.error("❌ Webhook inválido - dados obrigatórios ausentes")
      return res.status(400).json({
        success: false,
        error: "Dados obrigatórios ausentes",
      })
    }

    // Mapear status
    const { status: newStatus, message } = mapStatus(statusCode)
    const isPaymentPaid = isPaid(statusCode)

    console.log("📊 Status mapeado:", {
      statusCode,
      newStatus,
      isPaymentPaid,
      external_id,
    })

    // Preparar dados para atualização
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Se pago, adicionar timestamp de confirmação
    if (isPaymentPaid) {
      updateData.paid_at = paid_at ? new Date(paid_at).toISOString() : new Date().toISOString()
    }

    // Atualizar no Supabase
    const { data: updatedPayment, error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("external_id", external_id)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Erro ao atualizar pagamento:", updateError)

      // Se não encontrou o pagamento, pode ser que ainda não foi criado
      if (updateError.code === "PGRST116") {
        console.warn("⚠️ Pagamento não encontrado para external_id:", external_id)
        return res.status(404).json({
          success: false,
          error: "Pagamento não encontrado",
        })
      }

      throw updateError
    }

    console.log("✅ Pagamento atualizado via webhook:", {
      external_id,
      old_status: "pendente",
      new_status: newStatus,
      is_paid: isPaymentPaid,
    })

    // Responder à SuperPay
    res.json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: external_id,
      status: newStatus,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error)

    // Sempre responder com sucesso para evitar reenvios desnecessários
    res.status(200).json({
      success: false,
      error: "Erro interno",
      message: "Webhook recebido mas houve erro no processamento",
    })
  }
})

module.exports = router
