import axios from "axios"

const SUPERPAY_BASE_URL = process.env.SUPERPAY_BASE_URL || "https://api.superpaybr.com"
const SUPERPAY_TOKEN = process.env.SUPERPAY_TOKEN!
const SUPERPAY_SECRET = process.env.SUPERPAY_SECRET!

export interface SuperPayInvoiceRequest {
  external_id: string
  amount: number
  description?: string
  customer?: {
    name?: string
    email?: string
    document?: string
  }
}

export interface SuperPayInvoiceResponse {
  id: string
  external_id: string
  status: {
    code: number
    message: string
  }
  amount: number
  qr_code: string
  pix_code: string
  expires_at: string
  created_at: string
}

export class SuperPayService {
  private getHeaders() {
    return {
      Authorization: `Bearer ${SUPERPAY_TOKEN}`,
      "Content-Type": "application/json",
      "X-Secret-Key": SUPERPAY_SECRET,
    }
  }

  async createInvoice(data: SuperPayInvoiceRequest): Promise<SuperPayInvoiceResponse> {
    try {
      console.log("🚀 Criando fatura SuperPay:", data)

      const response = await axios.post(
        `${SUPERPAY_BASE_URL}/v4/invoices`,
        {
          external_id: data.external_id,
          amount: data.amount,
          description: data.description || "Frete PAC - Cartão SHEIN",
          customer: data.customer || {},
        },
        { headers: this.getHeaders() },
      )

      console.log("✅ Fatura criada com sucesso:", response.data)
      return response.data
    } catch (error: any) {
      console.error("❌ Erro ao criar fatura SuperPay:", error.response?.data || error.message)
      throw new Error(`Erro SuperPay: ${error.response?.data?.message || error.message}`)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${SUPERPAY_BASE_URL}/v4/auth/test`, { headers: this.getHeaders() })
      return response.status === 200
    } catch (error) {
      console.error("❌ Erro de conexão SuperPay:", error)
      return false
    }
  }
}

export const superPayService = new SuperPayService()
