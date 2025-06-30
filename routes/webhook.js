const express = require("express")
const router = express.Router()
const SuperPayService = require("../services/superpayService")
const { getFaturaByExternalId, updateFaturaStatus } = require("../supabaseClient")
const { mapStatusCode } = require("../utils/generateToken")

const superPayService = new SuperPayService()

/**
 * POST /api/webhook/superpay
 * Recebe notificações da SuperPayBR
 */
router.post("/superpay", async (req, res) => {
  try {
    console.log("🔔 Webhook SuperPayBR recebido")

    const webhookData = req.body
    const signature = req.headers["x-signature"] || req.headers["x-superpay-signature"]

    // Log dos dados recebidos (sem dados sensíveis)
    console.log("📨 Webhook data:", {
      external_id: webhookData.external_id,
      status: webhookData.status,
      amount: webhookData.amount,
      timestamp: new Date().toISOString(),
    })

    // Validar assinatura (opcional, mas recomendado)
    if (signature && !superPayService.validateWebhook(webhookData, signature)) {
      console.warn("⚠️ Webhook com assinatura inválida")
      return res.status(401).json({
        success: false,
        error: "Assinatura inválida",
      })
    }

    // Processar dados do webhook
    const processedData = superPayService.processWebhookData(webhookData)

    if (!processedData.external_id) {
      console.error("❌ Webhook sem external_id")
      return res.status(400).json({
        success: false,
        error: "external_id obrigatório",
      })
    }

    // Buscar fatura no Supabase
    const fatura = await getFaturaByExternalId(processedData.external_id)

    if (!fatura) {
      console.warn(`⚠️ Fatura não encontrada: ${processedData.external_id}`)
      return res.status(404).json({
        success: false,
        error: "Fatura não encontrada",
      })
    }

    // Mapear status code para status interno
    const newStatus = mapStatusCode(processedData.status_code)

    console.log(`🔄 Atualizando fatura ${processedData.external_id}: ${fatura.status} → ${newStatus}`)

    // Atualizar status no Supabase
    const updatedFatura = await updateFaturaStatus(processedData.external_id, {
      status: newStatus,
      webhookData: processedData.raw_data,
    })

    // Log específico para pagamento confirmado
    if (newStatus === "pago") {
      console.log("🎉 PAGAMENTO CONFIRMADO!", {
        external_id: processedData.external_id,
        amount: processedData.amount,
        customer: fatura.customer_name,
        paid_at: updatedFatura.paid_at,
      })
    }

    // Responder rapidamente para a SuperPayBR
    res.json({
      success: true,
      message: "Webhook processado",
      external_id: processedData.external_id,
      status: newStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro no webhook:", error)

    // Sempre responder para evitar reenvios desnecessários
    res.status(500).json({
      success: false,
      error: "Erro interno no webhook",
      timestamp: new Date().toISOString(),
    })
  }
})

/**
 * GET /api/webhook/test
 * Endpoint para testar webhook (desenvolvimento)
 */
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Webhook endpoint ativo",
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
  })
})

module.exports = router
