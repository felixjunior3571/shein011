const axios = require("axios")

class SuperPayService {
  constructor() {
    this.baseURL = process.env.SUPERPAY_API_URL || "https://api.superpay.com.br"
    this.token = process.env.SUPERPAY_TOKEN
    this.secretKey = process.env.SUPERPAY_SECRET_KEY

    if (!this.token || !this.secretKey) {
      throw new Error("SUPERPAY_TOKEN e SUPERPAY_SECRET_KEY são obrigatórios")
    }

    // Configurar axios
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "SHEIN-Card-System/1.0",
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
        console.error("❌ SuperPay Response Error:", {
          status: error.response?.status,
          data: error.response?.data,
          url: error.config?.url,
        })
        return Promise.reject(error)
      },
    )
  }

  // Testar conexão com SuperPay
  async testConnection() {
    try {
      const response = await this.client.get("/v4/user")

      return {
        success: true,
        message: "Conexão SuperPay OK",
        data: response.data,
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      }
    }
  }

  // Criar fatura PIX
  async createInvoice(invoiceData) {
    try {
      const payload = {
        amount: invoiceData.amount,
        external_id: invoiceData.external_id,
        description: invoiceData.description || "Pagamento SHEIN Card",
        webhook: invoiceData.webhook_url,
        order_url: invoiceData.order_url || invoiceData.redirect_url,
        expires_at: invoiceData.expires_at,
        customer: invoiceData.customer || {},
        payment_method: "pix",
      }

      console.log("🔄 Criando fatura SuperPay:", payload.external_id)

      const response = await this.client.post("/v4/invoices", payload)

      if (response.data && response.data.success) {
        console.log("✅ Fatura criada com sucesso:", response.data.data.external_id)
        return {
          success: true,
          data: response.data.data,
        }
      } else {
        throw new Error("Resposta inválida da SuperPay")
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura:", error.response?.data || error.message)

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        code: error.response?.data?.code,
        status: error.response?.status,
      }
    }
  }

  // Buscar fatura (usar apenas em emergência, não para polling)
  async getInvoice(externalId) {
    try {
      console.log("⚠️ ATENÇÃO: Consultando API SuperPay (use apenas em emergência)")

      const response = await this.client.get(`/v4/invoices/${externalId}`)

      if (response.data && response.data.success) {
        return {
          success: true,
          data: response.data.data,
        }
      } else {
        throw new Error("Fatura não encontrada")
      }
    } catch (error) {
      console.error("❌ Erro ao buscar fatura:", error.response?.data || error.message)

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      }
    }
  }

  // Cancelar fatura
  async cancelInvoice(externalId) {
    try {
      const response = await this.client.delete(`/v4/invoices/${externalId}`)

      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      console.error("❌ Erro ao cancelar fatura:", error.response?.data || error.message)

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status,
      }
    }
  }

  // Validar webhook signature
  validateWebhookSignature(payload, signature) {
    const crypto = require("crypto")

    const expectedSignature = crypto.createHmac("sha256", this.secretKey).update(JSON.stringify(payload)).digest("hex")

    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))
  }
}

module.exports = SuperPayService
