const express = require("express")
const router = express.Router()
const SuperPayService = require("../services/superpayService")
const { createFatura } = require("../supabaseClient")
const { generateFaturaData, formatErrorResponse, formatSuccessResponse } = require("../utils/generateToken")

const superPayService = new SuperPayService()

/**
 * POST /api/checkout
 * Cria uma nova fatura PIX
 */
router.post("/", async (req, res) => {
  try {
    const { amount = 10.0, redirect_url = "/obrigado" } = req.body

    // Validações
    if (amount <= 0 || amount > 10000) {
      return res
        .status(400)
        .json(formatErrorResponse("Valor deve estar entre R$ 0,01 e R$ 10.000,00", "INVALID_AMOUNT"))
    }

    // Gerar dados da fatura
    const faturaData = generateFaturaData(amount, redirect_url)

    console.log("🔄 Iniciando checkout:", faturaData.external_id)

    // Criar fatura na SuperPay
    const superPayResult = await superPayService.createInvoice(faturaData)

    if (!superPayResult.success) {
      throw new Error(`Erro SuperPay: ${superPayResult.error}`)
    }

    // Salvar no Supabase
    const faturaCompleta = {
      ...faturaData,
      superpay_id: superPayResult.data.superpay_id,
      qr_code: superPayResult.data.qr_code,
      pix_code: superPayResult.data.pix_code,
    }

    const savedFatura = await createFatura(faturaCompleta)

    console.log("✅ Checkout concluído:", savedFatura.external_id)

    // Resposta para o frontend
    res.json(
      formatSuccessResponse(
        {
          token: savedFatura.token,
          external_id: savedFatura.external_id,
          qr_code: savedFatura.qr_code,
          pix_code: savedFatura.pix_code,
          amount: savedFatura.amount,
          expires_at: savedFatura.expires_at,
          status_url: `/api/verifica-status?token=${savedFatura.token}`,
        },
        "Fatura PIX criada com sucesso",
      ),
    )
  } catch (error) {
    console.error("❌ Erro no checkout:", error.message)

    res.status(500).json(
      formatErrorResponse("Erro ao processar checkout. Tente novamente.", "CHECKOUT_ERROR", {
        message: error.message,
      }),
    )
  }
})

/**
 * GET /api/checkout/test
 * Testa conexão com SuperPay
 */
router.get("/test", async (req, res) => {
  try {
    const result = await superPayService.testConnection()

    if (result.success) {
      res.json(formatSuccessResponse(result.data, "Conexão SuperPay OK"))
    } else {
      res.status(500).json(formatErrorResponse("Falha na conexão SuperPay", "CONNECTION_ERROR", result))
    }
  } catch (error) {
    console.error("❌ Erro no teste de conexão:", error.message)
    res.status(500).json(formatErrorResponse("Erro interno no teste", "TEST_ERROR"))
  }
})

module.exports = router
