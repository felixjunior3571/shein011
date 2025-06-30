const express = require("express")
const router = express.Router()
const SuperPayService = require("../services/superpayService")
const { createFatura } = require("../supabaseClient")
const {
  validateCheckoutData,
  generateFaturaData,
  formatErrorResponse,
  formatSuccessResponse,
} = require("../utils/generateToken")

const superPayService = new SuperPayService()

/**
 * POST /api/checkout
 * Cria uma nova fatura PIX
 */
router.post("/", async (req, res) => {
  try {
    console.log("💳 Iniciando checkout:", req.body)

    // Validar dados de entrada
    validateCheckoutData(req.body)

    // Gerar dados da fatura
    const faturaData = generateFaturaData(req.body)

    console.log("🔄 Criando fatura:", faturaData.external_id)

    // Criar fatura na SuperPay
    const superPayResult = await superPayService.createInvoice(faturaData)

    if (!superPayResult.success) {
      throw new Error(`SuperPay: ${superPayResult.error}`)
    }

    // Adicionar dados da SuperPay à fatura
    const completeFaturaData = {
      ...faturaData,
      superpay_id: superPayResult.data.superpay_id,
      qr_code: superPayResult.data.qr_code,
      pix_code: superPayResult.data.pix_code,
    }

    // Salvar no Supabase
    const savedFatura = await createFatura(completeFaturaData)

    console.log("✅ Checkout concluído:", {
      external_id: savedFatura.external_id,
      token: savedFatura.token,
      amount: savedFatura.amount,
    })

    // Resposta para o frontend
    res.json(
      formatSuccessResponse(
        {
          external_id: savedFatura.external_id,
          token: savedFatura.token,
          qr_code: savedFatura.qr_code,
          pix_code: savedFatura.pix_code,
          amount: savedFatura.amount,
          expires_at: savedFatura.expires_at,
          status_url: `/api/verifica-status?token=${savedFatura.token}`,
        },
        "Fatura criada com sucesso",
      ),
    )
  } catch (error) {
    console.error("❌ Erro no checkout:", error.message)

    // Tratamento específico de erros
    let statusCode = 500
    let errorCode = "CHECKOUT_ERROR"

    if (error.message.includes("Campos obrigatórios")) {
      statusCode = 400
      errorCode = "VALIDATION_ERROR"
    } else if (error.message.includes("SuperPay")) {
      statusCode = 502
      errorCode = "SUPERPAY_ERROR"
    } else if (error.message.includes("Erro no banco")) {
      statusCode = 503
      errorCode = "DATABASE_ERROR"
    }

    res.status(statusCode).json(formatErrorResponse(error.message, errorCode))
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
      res.json(
        formatSuccessResponse(
          {
            superpay_status: "connected",
            api_version: "v4",
            timestamp: new Date().toISOString(),
          },
          "Conexão SuperPay OK",
        ),
      )
    } else {
      res.status(502).json(formatErrorResponse("Falha na conexão SuperPay", "SUPERPAY_CONNECTION_ERROR", result))
    }
  } catch (error) {
    console.error("❌ Erro no teste:", error.message)
    res.status(500).json(formatErrorResponse(error.message, "TEST_ERROR"))
  }
})

/**
 * POST /api/checkout/simulate
 * Simula um checkout para testes (desenvolvimento)
 */
router.post("/simulate", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json(formatErrorResponse("Endpoint disponível apenas em desenvolvimento", "FORBIDDEN"))
  }

  try {
    const simulatedData = {
      amount: req.body.amount || 29.9,
      customer_name: "Cliente Teste",
      customer_email: "teste@exemplo.com",
      redirect_url: "/obrigado",
    }

    // Usar o endpoint normal de checkout
    req.body = simulatedData
    return router.handle(req, res)
  } catch (error) {
    console.error("❌ Erro na simulação:", error.message)
    res.status(500).json(formatErrorResponse(error.message, "SIMULATION_ERROR"))
  }
})

module.exports = router
