// Sistema de armazenamento global para confirmações de pagamento
interface PaymentConfirmation {
  externalId: string
  invoiceId: string
  token: string | null
  isPaid: boolean
  isRefunded: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  amount: number
  paymentDate: string | null
  statusCode: number
  statusName: string
  statusDescription: string
  receivedAt: string
  rawData: any
}

interface TryploPayWebhookPayload {
  event: {
    type: "webhook.update" | "invoice.update"
    date: string
  }
  invoices: {
    id: number
    external_id: string
    token: string | null
    status: {
      code: number
      title: string
      description: string
      text: string
    }
    prices: {
      total: number
    }
    payment: {
      gateway: string
      payId: string
      payDate: string
      details: {
        pix_code: string
        qrcode: string
      }
    }
  }
}

// Armazenamento global em memória
const paymentConfirmations = new Map<string, PaymentConfirmation>()
const realtimeEvents: any[] = []

// Mapeamento completo de status codes TryploPay
const STATUS_CODES = {
  1: {
    name: "Aguardando Pagamento",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  2: { name: "Em Análise", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  3: {
    name: "Pago Parcialmente",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  4: { name: "Processando", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  5: { name: "Pago", isPaid: true, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false }, // CRÍTICO
  6: { name: "Cancelado", isPaid: false, isCanceled: true, isDenied: false, isRefunded: false, isExpired: false }, // CRÍTICO
  7: {
    name: "Aguardando Confirmação",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  8: { name: "Chargeback", isPaid: false, isCanceled: false, isDenied: false, isRefunded: true, isExpired: false },
  9: { name: "Estornado", isPaid: false, isCanceled: false, isDenied: false, isRefunded: true, isExpired: false }, // CRÍTICO
  10: { name: "Contestado", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  11: { name: "Autorizado", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  12: { name: "Negado", isPaid: false, isCanceled: false, isDenied: true, isRefunded: false, isExpired: false }, // CRÍTICO
  13: { name: "Bloqueado", isPaid: false, isCanceled: false, isDenied: true, isRefunded: false, isExpired: false },
  14: { name: "Suspenso", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  15: { name: "Vencido", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: true }, // CRÍTICO
  16: { name: "Erro", isPaid: false, isCanceled: false, isDenied: true, isRefunded: false, isExpired: false },
} as const

function savePaymentConfirmation(
  externalId: string,
  invoiceId: string,
  token: string | null,
  data: any,
): PaymentConfirmation {
  const statusCode = data.statusCode
  const statusInfo = STATUS_CODES[statusCode as keyof typeof STATUS_CODES] || STATUS_CODES[1]

  const confirmationData: PaymentConfirmation = {
    externalId,
    invoiceId: invoiceId.toString(),
    token,
    isPaid: statusInfo.isPaid,
    isRefunded: statusInfo.isRefunded,
    isDenied: statusInfo.isDenied,
    isExpired: statusInfo.isExpired,
    isCanceled: statusInfo.isCanceled,
    amount: data.amount || 0,
    paymentDate: data.paymentDate || null,
    statusCode,
    statusName: statusInfo.name,
    statusDescription: data.statusDescription || "",
    receivedAt: new Date().toISOString(),
    rawData: data,
  }

  // Salvar com múltiplas chaves para facilitar busca
  paymentConfirmations.set(externalId, confirmationData)
  paymentConfirmations.set(invoiceId.toString(), confirmationData)
  if (token) {
    paymentConfirmations.set(`token_${token}`, confirmationData)
  }

  // Adicionar ao log de eventos em tempo real
  realtimeEvents.unshift({
    timestamp: new Date().toISOString(),
    type: "payment_update",
    data: confirmationData,
  })

  // Manter apenas os últimos 100 eventos
  if (realtimeEvents.length > 100) {
    realtimeEvents.splice(100)
  }

  return confirmationData
}

function getPaymentConfirmation(identifier: string): PaymentConfirmation | null {
  // Buscar por external_id
  let confirmation = paymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por invoice_id
  confirmation = paymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por token
  confirmation = paymentConfirmations.get(`token_${identifier}`)
  if (confirmation) return confirmation

  return null
}

function getAllConfirmations(): PaymentConfirmation[] {
  const confirmations: PaymentConfirmation[] = []
  const seen = new Set<string>()

  for (const [key, value] of paymentConfirmations.entries()) {
    if (!seen.has(value.externalId)) {
      confirmations.push(value)
      seen.add(value.externalId)
    }
  }

  return confirmations.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
}

function getRealtimeEvents(): any[] {
  return [...realtimeEvents]
}

export {
  type PaymentConfirmation,
  type TryploPayWebhookPayload,
  STATUS_CODES,
  savePaymentConfirmation,
  getPaymentConfirmation,
  getAllConfirmations,
  getRealtimeEvents,
  paymentConfirmations,
  realtimeEvents,
}
