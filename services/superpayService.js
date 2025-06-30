const axios = require("axios")
require("dotenv").config()

class SuperPayService {
  constructor() {
    this.baseURL = process.env.SUPERPAY_BASE_URL
    this.token = process.env.SUPERPAY_TOKEN
    this.secret = process.env.SUPERPAY_SECRET

    if (!this.baseURL || !this.token || !this.secret) {
      throw new Error("Configurações da SuperPay são obrigatórias")
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    })
  }

  /**
   * Cria uma fatura PIX na SuperPayBR
   * @param {object} invoiceData - Dados da fatura
   * @returns {Promise<object>} Resposta da API
   */
  async createInvoice(invoiceData) {
    try {
      console.log("🚀 Criando fatura SuperPay:", invoiceData)

      const response = await this.client.post("/v4/invoices", invoiceData)

      console.log("✅ Fatura criada com sucesso:", response.data)
      return response.data
    } catch (error) {
      console.error("❌ Erro ao criar fatura SuperPay:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })

      throw new Error(`Erro SuperPay: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Valida webhook da SuperPay (se necessário)
   * @param {object} payload - Dados do webhook
   * @param {string} signature - Assinatura do webhook
   * @returns {boolean} True se válido
   */
  validateWebhook(payload, signature) {
    // Implementar validação de assinatura se necessário
    // Por enquanto, retorna true (ajustar conforme documentação SuperPay)
    return true
  }
}

module.exports = new SuperPayService()
