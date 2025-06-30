const axios = require("axios")

class SuperPayService {
  constructor() {
    this.baseURL = process.env.SUPERPAY_BASE_URL || "https://api.superpaybr.com"
    this.token = process.env.SUPERPAY_TOKEN
    this.secret = process.env.SUPERPAY_SECRET

    if (!this.token || !this.secret) {
      throw new Error("SUPERPAY_TOKEN e SUPERPAY_SECRET são obrigatórios")
    }

    // Configurar axios com defaults
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    })

    // Interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 SuperPay Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error("❌ SuperPay Request Error:", error.message)
        return Promise.reject(error)
      },
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ SuperPay Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error("❌ SuperPay Response Error:", error.response?.status, error.response?.data)
        return Promise.reject(error)
      },
    )
  }

  /**
   * Cria uma fatura PIX na SuperPay
   * @param {object} invoiceData - Dados da fatura
   * @returns {Promise<object>} Dados da fatura criada
   */
  async createInvoice(invoiceData) {
    try {
      const payload = {
        external_id: invoiceData.external_id,
        amount: invoiceData.amount,
        description: invoiceData.description || "Pagamento PIX",
        payer: {
          name: invoiceData.payer?.name || "Cliente",
          document: invoiceData.payer?.document || "",
          email: invoiceData.payer?.email || "",
        },
        expires_at: invoiceData.expires_at,
        webhook_url: invoiceData.webhook_url,
        payment_method: "pix",
      }

      console.log("📤 Criando fatura SuperPay:", payload.external_id)

      const response = await this.client.post("/v4/invoices", payload)

      if (response.data && response.data.success) {
        console.log("✅ Fatura criada com sucesso:", response.data.data.id)
        return {
          success: true,
          data: response.data.data,
        }
      } else {
        throw new Error("Resposta inválida da SuperPay")
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura SuperPay:", error.message)

      if (error.response?.data) {
        return {
          success: false,
          error: error.response.data.message || "Erro na SuperPay",
          details: error.response.data,
        }
      }

      return {
        success: false,
        error: "Erro de comunicação com SuperPay",
        details: error.message,
      }
    }
  }

  /**
   * Consulta uma fatura na SuperPay (usar apenas quando necessário)
   * @param {string} invoiceId - ID da fatura
   * @returns {Promise<object>} Dados da fatura
   */
  async getInvoice(invoiceId) {
    try {
      console.log("🔍 Consultando fatura SuperPay:", invoiceId)

      const response = await this.client.get(`/v4/invoices/${invoiceId}`)

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
        }
      } else {
        throw new Error("Resposta inválida da SuperPay")
      }
    } catch (error) {
      console.error("❌ Erro ao consultar fatura SuperPay:", error.message)

      return {
        success: false,
        error: error.response?.data?.message || "Erro ao consultar fatura",
        details: error.response?.data,
      }
    }
  }

  /**
   * Testa a conexão com a SuperPay
   * @returns {Promise<boolean>} True se conectado
   */
  async testConnection() {
    try {
      console.log("🔄 Testando conexão SuperPay...")

      const response = await this.client.get("/v4/ping")

      if (response.status === 200) {
        console.log("✅ Conexão SuperPay OK")
        return true
      }

      return false
    } catch (error) {
      console.error("❌ Erro de conexão SuperPay:", error.message)
      return false
    }
  }
}

module.exports = new SuperPayService()
