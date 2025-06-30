const express = require("express")
const { getFaturaByToken } = require("../supabaseClient")
const { isPaymentSuccessful, isPaymentFailed } = require("../utils/generateToken")

const router = express.Router()

// Endpoint para verificar status do pagamento
router.get("/verifica-status", async (req, res) => {
  try {
    const { token } = req.query

    // Validação do token
    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token obrigatório",
        code: "MISSING_TOKEN",
      })
    }

    if (token.length < 32) {
      return res.status(400).json({
        success: false,
        error: "Token inválido",
        code: "INVALID_TOKEN",
      })
    }

    console.log(`🔍 Verificando status para token: ${token.substring(0, 8)}...`)

    // Buscar fatura no Supabase (NUNCA na SuperPay)
    const fatura = await getFaturaByToken(token)

    if (!fatura) {
      return res.status(404).json({
        success: false,
        error: "Token não encontrado ou expirado",
        code: "TOKEN_NOT_FOUND",
      })
    }

    // Verificar se token expirou
    const now = new Date()
    const expiresAt = new Date(fatura.expires_at)

    if (now > expiresAt) {
      return res.status(410).json({
        success: false,
        error: "Token expirado",
        code: "TOKEN_EXPIRED",
        expired_at: fatura.expires_at,
      })
    }

    console.log(`📊 Status atual: ${fatura.status} para ${fatura.external_id}`)

    // Resposta baseada no status
    const response = {
      success: true,
      external_id: fatura.external_id,
      status: fatura.status,
      amount: fatura.amount,
      created_at: fatura.created_at,
      expires_at: fatura.expires_at,
    }

    // Se foi pago
    if (fatura.status === "pago") {
      response.paid = true
      response.paid_at = fatura.paid_at
      response.redirect = fatura.redirect_url || "/obrigado"

      console.log(`💰 Pagamento confirmado: ${fatura.external_id}`)
    }
    // Se ainda está pendente
    else if (fatura.status === "pendente" || fatura.status === "processando") {
      response.paid = false
      response.message = "Aguardando pagamento"
    }
    // Se falhou (recusado, cancelado, etc.)
    else {
      response.paid = false
      response.failed = true
      response.message = this.getStatusMessage(fatura.status)
    }

    res.json(response)
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error)

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      code: "INTERNAL_ERROR",
    })
  }
})

// Função para obter mensagem amigável do status
function getStatusMessage(status) {
  const messages = {
    pendente: "Aguardando pagamento",
    processando: "Processando pagamento",
    pago: "Pagamento confirmado",
    recusado: "Pagamento recusado",
    cancelado: "Pagamento cancelado",
    estornado: "Pagamento estornado",
    vencido: "Pagamento vencido",
    erro: "Erro no pagamento",
  }

  return messages[status] || "Status desconhecido"
}

// Endpoint para estatísticas (opcional)
router.get("/stats", async (req, res) => {
  try {
    const { supabase } = require("../supabaseClient")

    const { data, error } = await supabase
      .from("faturas")
      .select("status")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24h

    if (error) {
      throw error
    }

    // Contar por status
    const stats = data.reduce((acc, fatura) => {
      acc[fatura.status] = (acc[fatura.status] || 0) + 1
      return acc
    }, {})

    res.json({
      success: true,
      period: "últimas 24 horas",
      stats: stats,
      total: data.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

module.exports = router
