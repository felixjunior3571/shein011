const express = require("express")
const router = express.Router()
const { getFaturaByToken } = require("../supabaseClient")
const {
  isTokenExpired,
  isPaymentSuccessful,
  isPaymentFailed,
  formatErrorResponse,
  formatSuccessResponse,
} = require("../utils/generateToken")

/**
 * GET /api/verifica-status?token=...
 * Verifica status do pagamento via token (consulta apenas Supabase)
 */
router.get("/verifica-status", async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json(formatErrorResponse("Token é obrigatório", "MISSING_TOKEN"))
    }

    console.log("🔍 Verificando status para token:", token.substring(0, 8) + "...")

    // Buscar fatura no Supabase (NUNCA na SuperPay)
    const fatura = await getFaturaByToken(token)

    if (!fatura) {
      return res.status(404).json(formatErrorResponse("Token não encontrado ou inválido", "INVALID_TOKEN"))
    }

    // Verificar se token expirou
    if (isTokenExpired(fatura.expires_at)) {
      console.log("⏰ Token expirado:", fatura.external_id)
      return res.status(410).json(formatErrorResponse("Token expirado", "TOKEN_EXPIRED"))
    }

    // Verificar status do pagamento
    if (isPaymentSuccessful(fatura.status)) {
      console.log("💰 Pagamento confirmado:", fatura.external_id)
      return res.json(
        formatSuccessResponse(
          {
            paid: true,
            redirect: fatura.redirect_url,
            external_id: fatura.external_id,
            paid_at: fatura.paid_at,
            amount: fatura.amount,
          },
          "Pagamento confirmado",
        ),
      )
    }

    if (isPaymentFailed(fatura.status)) {
      console.log("❌ Pagamento falhou:", fatura.external_id, fatura.status)
      return res.json(
        formatSuccessResponse(
          {
            paid: false,
            status: fatura.status,
            external_id: fatura.external_id,
            message: getStatusMessage(fatura.status),
          },
          "Status atualizado",
        ),
      )
    }

    // Status pendente
    console.log("⏳ Pagamento pendente:", fatura.external_id)
    res.json(
      formatSuccessResponse(
        {
          paid: false,
          status: "aguardando",
          external_id: fatura.external_id,
          expires_at: fatura.expires_at,
          message: "Aguardando pagamento",
        },
        "Pagamento pendente",
      ),
    )
  } catch (error) {
    console.error("❌ Erro na verificação de status:", error.message)

    res
      .status(500)
      .json(formatErrorResponse("Erro interno na verificação", "STATUS_CHECK_ERROR", { message: error.message }))
  }
})

/**
 * Retorna mensagem amigável para cada status
 */
function getStatusMessage(status) {
  const messages = {
    recusado: "Pagamento recusado pelo banco. Tente outro método.",
    cancelado: "Pagamento cancelado.",
    estornado: "Pagamento estornado.",
    vencido: "Pagamento vencido. Gere uma nova cobrança.",
    pendente: "Aguardando pagamento.",
  }

  return messages[status] || "Status desconhecido"
}

module.exports = router
