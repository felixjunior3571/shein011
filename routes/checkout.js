const express = require("express")
const { supabase } = require("../supabaseClient")
const { generateSecureToken, generateExternalId, getExpirationDate } = require("../utils/generateToken")
const superPayService = require("../services/superpayService")

const router = express.Router()

/**
 * POST /checkout
 * Cria uma fatura PIX e salva no banco
 */
router.post("/", async (req, res) => {
  try {
    const { amount, description, payer } = req.body

    // Validações
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valor é obrigatório e deve ser maior que zero",
      })
    }

    // Gerar IDs únicos
    const external_id = generateExternalId()
    const token = generateSecureToken()
    const expires_at = getExpirationDate()

    console.log(`🛒 Iniciando checkout: ${external_id}`)

    // Criar fatura na SuperPay
    const webhookUrl = process.env.WEBHOOK_BASE_URL ? `${process.env.WEBHOOK_BASE_URL}/webhook/superpay` : undefined

    const invoiceResult = await superPayService.createInvoice({
      external_id,
      amount: Number.parseFloat(amount),
      description: description || "Pagamento PIX",
      payer: payer || {},
      expires_at: expires_at.toISOString(),
      webhook_url: webhookUrl,
    })

    if (!invoiceResult.success) {
      console.error("❌ Erro ao criar fatura SuperPay:", invoiceResult.error)
      return res.status(500).json({
        success: false,
        error: "Erro ao gerar PIX",
        details: invoiceResult.error,
      })
    }

    const invoice = invoiceResult.data

    // Salvar no Supabase
    const { data: payment, error: dbError } = await supabase
      .from("payments")
      .insert({
        external_id,
        token,
        status: "pendente",
        amount: Number.parseFloat(amount),
        pix_code: invoice.pix_code,
        qr_code_base64: invoice.qr_code_base64,
        superpay_invoice_id: invoice.id,
        expires_at: expires_at.toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Erro ao salvar no banco:", dbError.message)
      return res.status(500).json({
        success: false,
        error: "Erro ao salvar pagamento",
        details: dbError.message,
      })
    }

    console.log(`✅ Checkout criado com sucesso: ${external_id}`)

    // Retornar dados para o frontend
    res.json({
      success: true,
      data: {
        external_id,
        token,
        amount: Number.parseFloat(amount),
        pix_code: invoice.pix_code,
        qr_code_base64: invoice.qr_code_base64,
        expires_at: expires_at.toISOString(),
        status: "pendente",
      },
    })
  } catch (error) {
    console.error("❌ Erro no checkout:", error.message)
    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      details: error.message,
    })
  }
})

module.exports = router
