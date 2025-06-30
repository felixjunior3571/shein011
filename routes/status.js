const express = require("express")
const router = express.Router()
const { getFaturaByToken } = require("../supabaseClient")
const { isTokenValid, isPaymentSuccessful, isPaymentFailed, getStatusMessage } = require("../utils/generateToken")

/**
 * GET /api/verifica-status?token=...
 * Verifica status do pagamento via token
 */
router.get("/", async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token obrigatório",
      })
    }

    console.log(`🔍 Verificando status para token: ${token.substring(0, 8)}...`)

    // Buscar fatura no Supabase (NUNCA na SuperPayBR!)
    const fatura = await getFaturaByToken(token)

    if (!fatura) {
      console.warn(`⚠️ Token não encontrado: ${token.substring(0, 8)}...`)
      return res.status(404).json({
        success: false,
        error: "Token inválido ou expirado",
      })
    }

    // Verificar se token não expirou
    if (!isTokenValid(fatura.expires_at)) {
      console.warn(`⏰ Token expirado: ${fatura.external_id}`)
      return res.status(410).json({
        success: false,
        error: "Token expirado",
        status: "expired",
      })
    }

    const status = fatura.status
    const message = getStatusMessage(status)

    console.log(`📊 Status da fatura ${fatura.external_id}: ${status}`)

    // Resposta baseada no status
    if (isPaymentSuccessful(status)) {
      // PAGAMENTO CONFIRMADO!
      return res.json({
        success: true,
        paid: true,
        status: "pago",
        message: "Pagamento confirmado!",
        redirect: fatura.redirect_url || "/obrigado",
        data: {
          external_id: fatura.external_id,
          amount: fatura.amount,
          paid_at: fatura.paid_at,
          customer_name: fatura.customer_name,
        },
      })
    }

    if (isPaymentFailed(status)) {
      // PAGAMENTO FALHOU
      return res.json({
        success: false,
        paid: false,
        status: status,
        message: message,
        error: `Pagamento ${status}`,
        data: {
          external_id: fatura.external_id,
          amount: fatura.amount,
        },
      })
    }

    // AINDA PENDENTE
    return res.json({
      success: true,
      paid: false,
      status: "aguardando",
      message: "Aguardando pagamento",
      data: {
        external_id: fatura.external_id,
        amount: fatura.amount,
        expires_at: fatura.expires_at,
        time_left: Math.max(0, Math.floor((new Date(fatura.expires_at) - new Date()) / 1000)),
      },
    })
  } catch (error) {
    console.error("❌ Erro na verificação de status:", error)
    res.status(500).json({
      success: false,
      error: "Erro interno na verificação",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

/**
 * GET /api/verifica-status/health
 * Health check do endpoint de status
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Endpoint de verificação ativo",
    timestamp: new Date().toISOString(),
  })
})

module.exports = router
