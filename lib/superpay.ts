interface SuperPayInvoiceRequest {
  amount: number
  external_id: string
  customer: {
    name: string
    email: string
    document: string
  }
  description: string
  expires_at?: string
}

interface SuperPayInvoiceResponse {
  id: string
  external_id: string
  amount: number
  status: {
    code: number
    title: string
    text: string
  }
  pix: {
    qr_code: string
    payload: string
    image: string
  }
  customer: {
    name: string
    email: string
    document: string
  }
  description: string
  created_at: string
  expires_at: string
}

export class SuperPayService {
  private baseUrl: string
  private token: string
  private secret: string

  constructor() {
    this.baseUrl = process.env.SUPERPAY_BASE_URL || "https://api.superpaybr.com"
    this.token = process.env.SUPERPAY_TOKEN!
    this.secret = process.env.SUPERPAY_SECRET!

    if (!this.token || !this.secret) {
      throw new Error("SuperPay credentials not configured")
    }
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
      "X-Secret-Key": this.secret,
    }
  }

  async createInvoice(data: SuperPayInvoiceRequest): Promise<SuperPayInvoiceResponse> {
    try {
      console.log("🔄 Criando fatura SuperPay:", data.external_id)

      const response = await fetch(`${this.baseUrl}/v4/invoices`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erro SuperPay:", response.status, errorText)
        throw new Error(`SuperPay API Error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log("✅ Fatura SuperPay criada:", result.id)

      return result
    } catch (error) {
      console.error("❌ Erro ao criar fatura SuperPay:", error)
      throw error
    }
  }

  // Método para validar webhook (opcional)
  validateWebhook(payload: string, signature: string): boolean {
    // Implementar validação de assinatura se necessário
    // Por enquanto, retorna true
    return true
  }
}

export const superPayService = new SuperPayService()
