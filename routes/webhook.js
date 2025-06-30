const express = require("express")
const { supabase } = require("../supabaseClient")
const { mapStatusCode } = require("../utils/statusMap")

const router = express.Router()

/**
 * POST /webhook/superpay
 * Recebe webhooks da SuperPay com atualizações de status
 */
router.post("/", async (req, res) => {
  try {
    const webhookData = req.body

    console.log("🔔 Webhook recebido da SuperPay:", JSON.stringify(webhookData, null, 2))

    // Validar dados do webhook
    if (!webhookData.external_id || !webhookData.status) {
      console.error("❌ Webhook inválido: faltam dados obrigatórios")
      return res.status(400).json({
        success: false,
        error: "Dados do webhook inválidos",
      })
    }

    const { external_id, status: statusCode, invoice_id } = webhookData

    // Mapear status code para status interno
    const newStatus = mapStatusCode(Number.parseInt(statusCode))

    console.log(`📊 Atualizando status: ${external_id} → ${newStatus} (código: ${statusCode})`)

    // Preparar dados para atualização
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Se status é "pago", adicionar timestamp de confirmação
    if (newStatus === "pago") {
      updateData.paid_at = new Date().toISOString()
      console.log(`💰 Pagamento confirmado: ${external_id}`)
    }

    // Atualizar no Supabase
    const { data: payment, error: dbError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("external_id", external_id)
      .select()
      .single()

    if (dbError) {
      console.error("❌ Erro ao atualizar no banco:", dbError.message)
      // Não retornar erro para evitar reenvio do webhook
      return res.json({
        success: true,
        message: "Webhook processado (erro interno registrado)",
      })
    }

    if (!payment) {
      console.error("❌ Pagamento não encontrado:", external_id)
      return res.json({
        success: true,
        message: "Pagamento não encontrado",
      })
    }

    console.log(`✅ Status atualizado com sucesso: ${external_id} → ${newStatus}`)

    // Sempre retornar sucesso para evitar reenvios
    res.json({
      success: true,
      message: "Webhook processado com sucesso",
      data: {
        external_id,
        old_status: payment.status,
        new_status: newStatus,
      },
    })
  } catch (error) {
    console.error("❌ Erro no webhook:", error.message)

    // Sempre retornar sucesso para evitar reenvios
    res.json({
      success: true,
      message: "Webhook processado (erro registrado)",
      error: error.message,
    })
  }
})

module.exports = router
