const express = require("express")
const router = express.Router()
const SuperPayService = require("../services/superpayService")
const { updateFaturaStatus, getFaturaByExternalId } = require("../supabaseClient")
const { mapSuperpayStatus, formatErrorResponse, formatSuccessResponse } = require("../utils/generateToken")

const superPayService = new SuperPayService()

/**
 * POST /api/webhook/superpay
 * Recebe notificações de status da SuperPayBR
 */
router.post("/superpay", async (req, res) => {
  try {
    const payload = req.body
    const signature = req.headers["x-superpay-signature"]

    console.log("🔔 Webhook recebido:", {
      external_id: payload.external_id,
      status_code: payload.status?.code,
      timestamp: new Date().toISOString(),
    })

    // Validação básica do payload
    if (!payload.external_id || !payload.status) {
      console.error("❌ Webhook inválido - campos obrigatórios ausentes")
      return res.status(400).json(formatErrorResponse("Payload inválido", "INVALID_WEBHOOK_PAYLOAD"))
    }

    // Validar assinatura (se configurada)
    if (signature && !superPayService.validateWebhook(payload, signature)) {
      console.error("❌ Webhook com assinatura inválida")
      return res.status(401).json(formatErrorResponse("Assinatura inválida", "INVALID_SIGNATURE"))
    }

    // Buscar fatura no banco
    const fatura = await getFaturaByExternalId(payload.external_id)

    if (!fatura) {
      console.error("❌ Fatura não encontrada:", payload.external_id)
      return res.status(404).json(formatErrorResponse("Fatura não encontrada", "INVOICE_NOT_FOUND"))
    }

    // Mapear status da SuperPay
    const newStatus = mapSuperpayStatus(payload.status.code)

    // Preparar dados de atualização
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Se pagamento confirmado, salvar timestamp
    if (payload.status.code === 5) {
      updateData.paid_at = new Date().toISOString()
      console.log("💰 Pagamento confirmado:", payload.external_id)
    }

    // Atualizar no banco
    const updatedFatura = await updateFaturaStatus(payload.external_id, updateData)

    console.log("✅ Webhook processado:", {
      external_id: payload.external_id,
      old_status: fatura.status,
      new_status: newStatus,
      paid_at: updateData.paid_at,
    })

    // Resposta para SuperPay
    res.json(
      formatSuccessResponse(
        {
          external_id: payload.external_id,
          processed_at: new Date().toISOString(),
          status: newStatus,
        },
        "Webhook processado com sucesso",
      ),
    )
  } catch (error) {
    console.error("❌ Erro no webhook:", error.message)

    // Sempre responder 200 para evitar reenvios desnecessários
    res.status(200).json(formatErrorResponse("Erro interno no webhook", "WEBHOOK_ERROR", { message: error.message }))
  }
})

/**
 * GET /api/webhook/test
 * Testa o endpoint de webhook
 */
router.get("/test", (req, res) => {
  res.json(
    formatSuccessResponse(
      {
        endpoint: "/api/webhook/superpay",
        method: "POST",
        status: "active",
        timestamp: new Date().toISOString(),
      },
      "Endpoint de webhook ativo",
    ),
  )
})

module.exports = router
