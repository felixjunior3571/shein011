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
 * Verifica status do pagamento via token (NUNCA consulta SuperPay)
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
    if (isTokenExpired(fatura.created_at)) {
      return res.status(410).json(formatErrorResponse("Token expirado", "TOKEN_EXPIRED"))
    }

    // Verificar status do pagamento
    if (isPaymentSuccessful(fatura.status)) {
      console.log("✅ Pagamento confirmado:", fatura.external_id)

      return res.json(
        formatSuccessResponse(
          {
            paid: true,
            external_id: fatura.external_id,
            amount: fatura.amount,
            paid_at: fatura.paid_at,
            redirect_url: fatura.redirect_url || "/obrigado",
          },
          "Pagamento confirmado",
        ),
      )
    }

    if (isPaymentFailed(fatura.status)) {
      const statusMessages = {
        recusado: "Pagamento recusado",
        cancelado: "Pagamento cancelado",
        estornado: "Pagamento estornado",
        vencido: "Pagamento vencido",
      }

      return res.json(
        formatErrorResponse(statusMessages[fatura.status] || "Pagamento não realizado", "PAYMENT_FAILED", {
          status: fatura.status,
        }),
      )
    }

    // Status pendente ou processando
    console.log("⏳ Pagamento pendente:", fatura.external_id)

    res.json(
      formatSuccessResponse(
        {
          paid: false,
          status: fatura.status,
          external_id: fatura.external_id,
          amount: fatura.amount,
          expires_at: fatura.expires_at,
          qr_code: fatura.qr_code,
          pix_code: fatura.pix_code,
        },
        "Aguardando pagamento",
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
 * GET /api/status/health
 * Health check específico para verificação de status
 */
router.get("/status/health", (req, res) => {
  res.json(
    formatSuccessResponse(
      {
        endpoint: "/api/verifica-status",
        method: "GET",
        parameters: ["token"],
        status: "active",
      },
      "Endpoint de verificação ativo",
    ),
  )
})

module.exports = router
