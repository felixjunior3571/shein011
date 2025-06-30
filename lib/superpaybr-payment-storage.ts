// Sistema de armazenamento global para confirmações de pagamento SuperPayBR
interface SuperPayBRPaymentConfirmation {
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

interface SuperPayBRWebhookPayload {
  event: {
    type: "webhook.update" | "invoice.update"
    date: string
  }
  invoices: {
    id: string
    external_id: string
    token: string | null
    date: string
    status: {
      code: number
      title: string
      description: string
      text: string
    }
    customer: number
    prices: {
      total: number
      discount: number
      taxs: {
        others: number
      }
      refound: number | null
    }
    type: string
    payment: {
      gateway: string
      date: string
      due: string
      card: any
      payId: string | null
      payDate: string
      details: {
        barcode: string | null
        pix_code: string | null
        qrcode: string | null
        url: string | null
      }
    }
  }
}

// Armazenamento global em memória
const superPayBRPaymentConfirmations = new Map<string, SuperPayBRPaymentConfirmation>()
const superPayBRRealtimeEvents: any[] = []

// Mapeamento completo de status codes SuperPayBR
const SUPERPAYBR_STATUS_CODES = {
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
  5: {
    name: "Pagamento Confirmado!",
    isPaid: true,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  }, // CRÍTICO
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

function saveSuperPayBRPaymentConfirmation(
  externalId: string,
  invoiceId: string,
  token: string | null,
  data: any,
): SuperPayBRPaymentConfirmation {
  const statusCode = data.statusCode
  const statusInfo =
    SUPERPAYBR_STATUS_CODES[statusCode as keyof typeof SUPERPAYBR_STATUS_CODES] || SUPERPAYBR_STATUS_CODES[1]

  const confirmationData: SuperPayBRPaymentConfirmation = {
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
  superPayBRPaymentConfirmations.set(externalId, confirmationData)
  superPayBRPaymentConfirmations.set(invoiceId.toString(), confirmationData)
  if (token) {
    superPayBRPaymentConfirmations.set(`token_${token}`, confirmationData)
  }

  // Adicionar ao log de eventos em tempo real
  superPayBRRealtimeEvents.unshift({
    timestamp: new Date().toISOString(),
    type: "superpaybr_payment_update",
    data: confirmationData,
  })

  // Manter apenas os últimos 100 eventos
  if (superPayBRRealtimeEvents.length > 100) {
    superPayBRRealtimeEvents.splice(100)
  }

  return confirmationData
}

function getSuperPayBRPaymentConfirmation(identifier: string): SuperPayBRPaymentConfirmation | null {
  // Buscar por external_id
  let confirmation = superPayBRPaymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por invoice_id
  confirmation = superPayBRPaymentConfirmations.get(identifier)
  if (confirmation) return confirmation

  // Buscar por token
  confirmation = superPayBRPaymentConfirmations.get(`token_${identifier}`)
  if (confirmation) return confirmation

  return null
}

function getAllSuperPayBRConfirmations(): SuperPayBRPaymentConfirmation[] {
  const confirmations: SuperPayBRPaymentConfirmation[] = []
  const seen = new Set<string>()

  for (const [key, value] of superPayBRPaymentConfirmations.entries()) {
    if (!seen.has(value.externalId)) {
      confirmations.push(value)
      seen.add(value.externalId)
    }
  }

  return confirmations.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
}

function getSuperPayBRRealtimeEvents(): any[] {
  return [...superPayBRRealtimeEvents]
}

export {
  type SuperPayBRPaymentConfirmation,
  type SuperPayBRWebhookPayload,
  SUPERPAYBR_STATUS_CODES,
  saveSuperPayBRPaymentConfirmation,
  getSuperPayBRPaymentConfirmation,
  getAllSuperPayBRConfirmations,
  getSuperPayBRRealtimeEvents,
  superPayBRPaymentConfirmations,
  superPayBRRealtimeEvents,
}
