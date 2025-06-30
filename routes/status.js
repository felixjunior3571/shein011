const express = require("express")
const { supabase } = require("../supabaseClient")
const { getStatusMessage, isPaidStatus, isErrorStatus } = require("../utils/statusMap")
const { isTokenExpired } = require("../utils/generateToken")

const router = express.Router()

/**
 * GET /verifica-status?token=...
 * Verifica o status de um pagamento via token
 */
router.get("/", async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token é obrigatório",
      })
    }

    console.log(`🔍 Verificando status do token: ${token.substring(0, 8)}...`)

    // Buscar pagamento no Supabase (NUNCA na SuperPay)
    const { data: payment, error: dbError } = await supabase.from("payments").select("*").eq("token", token).single()

    if (dbError || !payment) {
      console.error("❌ Pagamento não encontrado:", token.substring(0, 8))
      return res.status(404).json({
        success: false,
        error: "Pagamento não encontrado",
        paid: false,
      })
    }

    // Verificar se token expirou
    if (isTokenExpired(payment.expires_at)) {
      console.log(`⏰ Token expirado: ${token.substring(0, 8)}`)
      return res.json({
        success: true,
        paid: false,
        status: "vencido",
        message: "Token expirado",
        data: {
          external_id: payment.external_id,
          status: "vencido",
          expired: true,
        },
      })
    }

    // Obter mensagem amigável do status
    const statusInfo = getStatusMessage(payment.status)
    const paid = isPaidStatus(payment.status)

    console.log(`📊 Status encontrado: ${payment.external_id} → ${payment.status}`)

    // Resposta padronizada
    const response = {
      success: true,
      paid,
      status: payment.status,
      message: statusInfo.message,
      description: statusInfo.description,
      action: statusInfo.action,
      data: {
        external_id: payment.external_id,
        amount: payment.amount,
        status: payment.status,
        created_at: payment.created_at,
        expires_at: payment.expires_at,
        paid_at: payment.paid_at,
      },
    }

    // Log específico para pagamentos aprovados
    if (paid) {
      console.log(`💰 Pagamento confirmado: ${payment.external_id}`)
    }

    res.json(response)
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error.message)
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      paid: false,
      details: error.message,
    })
  }
})

module.exports = router
