const express = require("express")
const { generateExternalId, generateSecureToken } = require("../utils/generateToken")
const { createFatura } = require("../supabaseClient")
const SuperPayService = require("../services/superpayService")

const router = express.Router()

// Endpoint para criar checkout PIX
router.post("/", async (req, res) => {
  try {
    const { amount, description, customer } = req.body

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valor inválido",
        code: "INVALID_AMOUNT",
      })
    }

    if (amount > 5000) {
      return res.status(400).json({
        success: false,
        error: "Valor máximo de R$ 5.000,00",
        code: "AMOUNT_TOO_HIGH",
      })
    }

    // Gerar IDs únicos
    const externalId = generateExternalId()
    const token = generateSecureToken()
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || "http://localhost:3000"}/api/webhook/superpay`
    const redirectUrl = "/obrigado"

    console.log("🔄 Iniciando checkout:", { externalId, amount })

    // Criar fatura na SuperPay
    const superPayService = new SuperPayService()
    const invoiceResult = await superPayService.createInvoice({
      amount: Number.parseFloat(amount),
      external_id: externalId,
      description: description || "Pagamento SHEIN Card",
      webhook_url: webhookUrl,
      redirect_url: redirectUrl,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutos
      customer: customer || {},
    })

    if (!invoiceResult.success) {
      console.error("❌ Erro SuperPay:", invoiceResult.error)
      return res.status(500).json({
        success: false,
        error: "Erro ao criar PIX",
        details: invoiceResult.error,
        code: "SUPERPAY_ERROR",
      })
    }

    const invoiceData = invoiceResult.data

    // Salvar no Supabase
    const faturaData = {
      external_id: externalId,
      token: token,
      status: "pendente",
      amount: Number.parseFloat(amount),
      qr_code: invoiceData.qr_code,
      qr_code_base64: invoiceData.qr_code_base64,
      pix_copy_paste: invoiceData.pix_copy_paste,
      redirect_url: redirectUrl,
      superpay_invoice_id: invoiceData.id,
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }

    const fatura = await createFatura(faturaData)

    console.log("✅ Checkout criado com sucesso:", externalId)

    // Resposta para o frontend
    res.json({
      success: true,
      data: {
        external_id: externalId,
        token: token,
        amount: Number.parseFloat(amount),
        qr_code: invoiceData.qr_code,
        qr_code_base64: invoiceData.qr_code_base64,
        pix_copy_paste: invoiceData.pix_copy_paste,
        expires_at: fatura.expires_at,
        status_url: `/api/verifica-status?token=${token}`,
      },
    })
  } catch (error) {
    console.error("❌ Erro no checkout:", error)

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      code: "INTERNAL_ERROR",
    })
  }
})

// Endpoint para testar conexão SuperPay
router.get("/test", async (req, res) => {
  try {
    const superPayService = new SuperPayService()
    const result = await superPayService.testConnection()

    res.json({
      success: result.success,
      message: result.success ? "SuperPay conectado" : "Erro na conexão",
      data: result.data,
      error: result.error,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

module.exports = router
