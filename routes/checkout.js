const express = require("express")
const router = express.Router()
const supabase = require("../supabaseClient")
const superPayService = require("../services/superpayService")
const { generateSecureToken, generateExternalId, getExpirationTime } = require("../utils/generateToken")

/**
 * POST /checkout
 * Cria uma nova fatura PIX e salva no banco
 */
router.post("/", async (req, res) => {
  try {
    const { amount, description = "Frete SHEIN", customer } = req.body

    // Validação básica
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Valor é obrigatório e deve ser maior que zero",
      })
    }

    // Gerar identificadores únicos
    const externalId = generateExternalId()
    const token = generateSecureToken()
    const expiresAt = getExpirationTime()

    console.log("🛒 Iniciando checkout:", { externalId, amount })

    // Preparar dados para SuperPay
    const invoiceData = {
      external_id: externalId,
      amount: Number.parseFloat(amount),
      description: description,
      payment_method: "pix",
      expires_at: Math.floor(expiresAt.getTime() / 1000), // Unix timestamp
      customer: customer || {
        name: "Cliente SHEIN",
        email: "cliente@shein.com",
      },
      webhook_url: `${process.env.WEBHOOK_BASE_URL || "https://seu-dominio.com"}/webhook/superpay`,
    }

    // Criar fatura na SuperPay
    const superPayResponse = await superPayService.createInvoice(invoiceData)

    // Salvar no Supabase
    const { data: payment, error: dbError } = await supabase
      .from("payments")
      .insert({
        external_id: externalId,
        token: token,
        status: "pendente",
        amount: amount,
        qr_code: superPayResponse.qr_code,
        pix_code: superPayResponse.pix_code || superPayResponse.copy_paste,
        superpay_invoice_id: superPayResponse.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Erro ao salvar no banco:", dbError)
      throw new Error("Erro interno do servidor")
    }

    console.log("✅ Checkout criado com sucesso:", { externalId, token })

    // Retornar dados para o frontend
    res.json({
      success: true,
      data: {
        token: token,
        external_id: externalId,
        qr_code: superPayResponse.qr_code,
        pix_code: superPayResponse.pix_code || superPayResponse.copy_paste,
        amount: amount,
        expires_at: expiresAt.toISOString(),
        status_url: `/verifica-status?token=${token}`,
      },
    })
  } catch (error) {
    console.error("❌ Erro no checkout:", error)

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      message: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

module.exports = router
