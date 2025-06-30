const axios = require("axios")

class SuperPayService {
  constructor() {
    this.baseURL = process.env.SUPERPAY_API_URL || "https://api.superpay.com.br"
    this.token = process.env.SUPERPAY_TOKEN
    this.secretKey = process.env.SUPERPAY_SECRET_KEY
    this.webhookUrl = process.env.SUPERPAY_WEBHOOK_URL

    if (!this.token || !this.secretKey) {
      throw new Error("SUPERPAY_TOKEN e SUPERPAY_SECRET_KEY são obrigatórios")
    }

    // Configurar axios com timeout e retry
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
        "User-Agent": "SuperPay-Integration/1.0",
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

  /**
   * Testa conexão com a API SuperPay
   */
  async testConnection() {
    try {
      const response = await this.client.get("/v4/auth/test")
      console.log("✅ Conexão SuperPay estabelecida")
      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      console.error("❌ Erro na conexão SuperPay:", error.message)
      return {
        success: false,
        error: error.message,
        status: error.response?.status,
      }
    }
  }

  /**
   * Cria uma nova fatura PIX na SuperPay v4
   */
  async createInvoice(faturaData) {
    try {
      const payload = {
        external_id: faturaData.external_id,
        amount: faturaData.amount,
        description: `Fatura SHEIN Card - ${faturaData.external_id}`,
        payer: {
          name: "Cliente SHEIN",
          document: "00000000000",
          email: "cliente@shein.com",
        },
        payment_method: "pix",
        expires_in: 900, // 15 minutos
        webhook: this.webhookUrl,
        order_url: `${process.env.FRONTEND_URL}/checkout?token=${faturaData.token}`,
        metadata: {
          source: "shein-card-system",
          token: faturaData.token,
          redirect_url: faturaData.redirect_url,
        },
      }

      console.log("🔄 Criando fatura SuperPay:", faturaData.external_id)

      const response = await this.client.post("/v4/invoices", payload)

      if (!response.data || !response.data.qr_code) {
        throw new Error("Resposta inválida da SuperPay - QR Code não encontrado")
      }

      console.log("✅ Fatura criada na SuperPay:", {
        external_id: faturaData.external_id,
        superpay_id: response.data.id,
        status: response.data.status,
      })

      return {
        success: true,
        data: {
          superpay_id: response.data.id,
          qr_code: response.data.qr_code,
          pix_code: response.data.pix_code || response.data.qr_code,
          status: response.data.status,
          expires_at: response.data.expires_at,
          amount: response.data.amount,
        },
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura SuperPay:", {
        external_id: faturaData.external_id,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })

      // Tratamento específico de erros da SuperPay
      if (error.response?.status === 401) {
        throw new Error("Token SuperPay inválido ou expirado")
      }

      if (error.response?.status === 422) {
        throw new Error(`Dados inválidos: ${error.response.data?.message || "Verifique os campos enviados"}`)
      }

      if (error.response?.status === 429) {
        throw new Error("Rate limit excedido na SuperPay. Tente novamente em alguns minutos.")
      }

      throw new Error(`Erro SuperPay: ${error.message}`)
    }
  }

  /**
   * NUNCA USAR - Consulta de status deve ser feita apenas via webhook
   * Método mantido apenas para emergências ou debug
   */
  async getInvoiceStatus(externalId) {
    console.warn("⚠️  ATENÇÃO: Consultando status diretamente na SuperPay - USE APENAS PARA DEBUG")

    try {
      const response = await this.client.get(`/v4/invoices/${externalId}`)
      return {
        success: true,
        data: response.data,
      }
    } catch (error) {
      console.error("❌ Erro ao consultar status SuperPay:", error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * Valida webhook da SuperPay
   */
  validateWebhook(payload, signature) {
    if (!this.secretKey) {
      console.warn("⚠️  SUPERPAY_SECRET_KEY não configurado - webhook não será validado")
      return true
    }

    try {
      const crypto = require("crypto")
      const expectedSignature = crypto
        .createHmac("sha256", this.secretKey)
        .update(JSON.stringify(payload))
        .digest("hex")

      return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSignature, "hex"))
    } catch (error) {
      console.error("❌ Erro na validação do webhook:", error.message)
      return false
    }
  }
}

module.exports = SuperPayService
