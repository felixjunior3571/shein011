const axios = require("axios")

class SuperPayService {
  constructor() {
    this.baseURL = process.env.SUPERPAY_BASE_URL || "https://api.superpay.com.br"
    this.token = process.env.SUPERPAY_TOKEN
    this.secretKey = process.env.SUPERPAY_SECRET_KEY
    this.webhookUrl = process.env.WEBHOOK_BASE_URL + "/api/webhook/superpay"

    if (!this.token || !this.secretKey) {
      throw new Error("❌ Credenciais SuperPayBR não configuradas")
    }

    // Configurar axios com timeout e retry
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 segundos
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SuperPayBR-Integration/1.0",
      },
    })

    // Interceptor para logs
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🔄 SuperPayBR Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error("❌ SuperPayBR Request Error:", error.message)
        return Promise.reject(error)
      },
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ SuperPayBR Response: ${response.status} ${response.config.url}`)
        return response
      },
      (error) => {
        console.error("❌ SuperPayBR Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        })
        return Promise.reject(error)
      },
    )
  }

  /**
   * Testa conexão com a API SuperPayBR
   */
  async testConnection() {
    try {
      const response = await this.client.get("/v4/auth", {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })

      console.log("✅ Conexão SuperPayBR estabelecida")
      return { success: true, data: response.data }
    } catch (error) {
      console.error("❌ Erro na conexão SuperPayBR:", error.message)
      return {
        success: false,
        error: error.response?.data || error.message,
      }
    }
  }

  /**
   * Cria uma fatura PIX na SuperPayBR
   * @param {Object} faturaData - Dados da fatura
   */
  async createInvoice(faturaData) {
    try {
      const payload = {
        // Dados obrigatórios
        external_id: faturaData.external_id,
        amount: Math.round(faturaData.amount * 100), // Converter para centavos
        description: faturaData.description || "Frete Cartão SHEIN",

        // Dados do cliente
        customer: {
          name: faturaData.customer_name,
          email: faturaData.customer_email,
          phone: faturaData.customer_phone,
          document: faturaData.customer_document,
        },

        // Configurações PIX
        payment_method: "pix",
        expires_in: 900, // 15 minutos

        // URLs de callback
        webhook_url: this.webhookUrl,
        return_url: faturaData.return_url || process.env.FRONTEND_URL + "/obrigado",

        // Metadados
        metadata: {
          shipping_method: faturaData.shipping_method,
          order_type: "frete_cartao",
          created_by: "shein-card-system",
        },
      }

      console.log("🔄 Criando fatura SuperPayBR:", {
        external_id: payload.external_id,
        amount: payload.amount / 100,
        customer: payload.customer.name,
      })

      const response = await this.client.post("/v4/invoices", payload, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          "X-Secret-Key": this.secretKey,
        },
      })

      const invoice = response.data

      console.log("✅ Fatura SuperPayBR criada:", {
        id: invoice.id,
        external_id: invoice.external_id,
        status: invoice.status?.text,
        amount: invoice.amount / 100,
      })

      return {
        success: true,
        data: {
          id: invoice.id,
          external_id: invoice.external_id,
          invoice_id: invoice.invoice_id,
          qr_code: invoice.pix?.qr_code,
          pix_code: invoice.pix?.payload,
          amount: invoice.amount / 100,
          status: invoice.status,
          expires_at: invoice.expires_at,
          created_at: invoice.created_at,
        },
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura SuperPayBR:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data,
      }
    }
  }

  /**
   * Valida webhook da SuperPayBR
   * @param {Object} webhookData - Dados do webhook
   * @param {string} signature - Assinatura do webhook
   */
  validateWebhook(webhookData, signature) {
    try {
      const crypto = require("crypto")
      const payload = JSON.stringify(webhookData)
      const expectedSignature = crypto.createHmac("sha256", this.secretKey).update(payload).digest("hex")

      const isValid = signature === expectedSignature

      if (!isValid) {
        console.warn("⚠️ Assinatura webhook SuperPayBR inválida")
      }

      return isValid
    } catch (error) {
      console.error("❌ Erro ao validar webhook:", error.message)
      return false
    }
  }

  /**
   * Processa dados do webhook
   * @param {Object} webhookData - Dados recebidos do webhook
   */
  processWebhookData(webhookData) {
    try {
      return {
        external_id: webhookData.external_id,
        invoice_id: webhookData.id,
        status_code: webhookData.status?.code,
        status_text: webhookData.status?.text,
        amount: webhookData.amount / 100,
        paid_at: webhookData.paid_at,
        raw_data: webhookData,
      }
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error.message)
      throw error
    }
  }
}

module.exports = SuperPayService
