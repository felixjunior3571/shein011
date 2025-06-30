const express = require("express")
const router = express.Router()
const SuperPayService = require("../services/superpayService")
const { insertFatura } = require("../supabaseClient")
const { generateSecureToken, generateExternalId, getExpirationDate } = require("../utils/generateToken")

const superPayService = new SuperPayService()

/**
 * POST /api/checkout
 * Cria uma nova fatura PIX
 */
router.post("/", async (req, res) => {
  try {
    console.log("🔄 Iniciando checkout SuperPayBR...")

    // Validar dados obrigatórios
    const {
      amount,
      customer_name,
      customer_email,
      customer_phone,
      customer_document,
      shipping_method = "SEDEX",
      description = "Frete Cartão SHEIN",
    } = req.body

    if (!amount || !customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        error: "Dados obrigatórios: amount, customer_name, customer_email",
      })
    }

    // Validar valor mínimo
    if (amount < 1 || amount > 1000) {
      return res.status(400).json({
        success: false,
        error: "Valor deve estar entre R$ 1,00 e R$ 1.000,00",
      })
    }

    // Gerar IDs únicos
    const external_id = generateExternalId()
    const token = generateSecureToken(external_id)
    const expires_at = getExpirationDate()

    console.log("📋 Dados do checkout:", {
      external_id,
      amount,
      customer: customer_name,
      expires_at: expires_at.toISOString(),
    })

    // Criar fatura na SuperPayBR
    const faturaData = {
      external_id,
      amount: Number.parseFloat(amount),
      customer_name,
      customer_email,
      customer_phone,
      customer_document,
      shipping_method,
      description,
      return_url: `${process.env.FRONTEND_URL}/obrigado?token=${token}`,
    }

    const superPayResult = await superPayService.createInvoice(faturaData)

    if (!superPayResult.success) {
      console.error("❌ Falha na SuperPayBR:", superPayResult.error)
      return res.status(500).json({
        success: false,
        error: "Erro ao gerar PIX. Tente novamente.",
        details: process.env.NODE_ENV === "development" ? superPayResult.error : undefined,
      })
    }

    // Salvar no Supabase
    const faturaSupabase = {
      external_id,
      token,
      status: "pendente",
      amount: Number.parseFloat(amount),
      customer_name,
      customer_email,
      customer_phone,
      invoice_id: superPayResult.data.invoice_id,
      qr_code: superPayResult.data.qr_code,
      pix_code: superPayResult.data.pix_code,
      expires_at: expires_at.toISOString(),
      redirect_url: "/obrigado",
      webhook_data: superPayResult.data,
    }

    const savedFatura = await insertFatura(faturaSupabase)

    console.log("✅ Checkout concluído:", {
      external_id: savedFatura.external_id,
      token: savedFatura.token,
      amount: savedFatura.amount,
    })

    // Resposta para o frontend
    res.json({
      success: true,
      data: {
        token: savedFatura.token,
        external_id: savedFatura.external_id,
        qr_code: superPayResult.data.qr_code,
        pix_code: superPayResult.data.pix_code,
        amount: savedFatura.amount,
        expires_at: savedFatura.expires_at,
        invoice_id: savedFatura.invoice_id,
        status: "pendente",
      },
    })
  } catch (error) {
    console.error("❌ Erro no checkout:", error)
    res.status(500).json({
      success: false,
      error: "Erro interno no checkout",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

/**
 * GET /api/checkout/test
 * Testa conexão com SuperPayBR
 */
router.get("/test", async (req, res) => {
  try {
    const result = await superPayService.testConnection()
    res.json(result)
  } catch (error) {
    console.error("❌ Erro no teste:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

module.exports = router
