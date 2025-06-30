// Sistema de armazenamento global para confirmações de pagamento SuperPay
interface SuperPayPaymentConfirmation {
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
  expiresAt: string // Token expira em 15 minutos
  rawData: any
}

interface SuperPayWebhookPayload {
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
const superPayPaymentConfirmations = new Map<string, SuperPayPaymentConfirmation>()
const superPayRealtimeEvents: any[] = []

// Mapeamento completo de status codes SuperPay
const SUPERPAY_STATUS_CODES = {
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
  }, // CRÍTICO - PAGO
  6: { name: "Cancelado", isPaid: false, isCanceled: true, isDenied: false, isRefunded: false, isExpired: false }, // CRÍTICO - CANCELADO
  7: {
    name: "Aguardando Confirmação",
    isPaid: false,
    isCanceled: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
  },
  8: { name: "Chargeback", isPaid: false, isCanceled: false, isDenied: false, isRefunded: true, isExpired: false },
  9: { name: "Estornado", isPaid: false, isCanceled: false, isDenied: false, isRefunded: true, isExpired: false }, // CRÍTICO - ESTORNADO
  10: { name: "Contestado", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  11: { name: "Autorizado", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  12: { name: "Negado", isPaid: false, isCanceled: false, isDenied: true, isRefunded: false, isExpired: false }, // CRÍTICO - NEGADO
  13: { name: "Bloqueado", isPaid: false, isCanceled: false, isDenied: true, isRefunded: false, isExpired: false },
  14: { name: "Suspenso", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: false },
  15: { name: "Vencido", isPaid: false, isCanceled: false, isDenied: false, isRefunded: false, isExpired: true }, // CRÍTICO - VENCIDO
  16: { name: "Erro", isPaid: false, isCanceled: false, isDenied: true, isRefunded: false, isExpired: false },
} as const

// Função para gerar token único com expiração de 15 minutos
function generateSecureToken(): string {
  return `SPY_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

// Função para verificar se token expirou
function isTokenExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt)
}

function saveSuperPayPaymentConfirmation(
  externalId: string,
  invoiceId: string,
  token: string | null,
  data: any,
): SuperPayPaymentConfirmation {
  const statusCode = data.statusCode
  const statusInfo = SUPERPAY_STATUS_CODES[statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]

  // Gerar token seguro se não fornecido
  const secureToken = token || generateSecureToken()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos

  const confirmationData: SuperPayPaymentConfirmation = {
    externalId,
    invoiceId: invoiceId.toString(),
    token: secureToken,
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
    expiresAt,
    rawData: data,
  }

  // Salvar com múltiplas chaves para facilitar busca
  superPayPaymentConfirmations.set(externalId, confirmationData)
  superPayPaymentConfirmations.set(invoiceId.toString(), confirmationData)
  superPayPaymentConfirmations.set(`token_${secureToken}`, confirmationData)

  // Adicionar ao log de eventos em tempo real
  superPayRealtimeEvents.unshift({
    timestamp: new Date().toISOString(),
    type: "superpay_payment_update",
    data: confirmationData,
  })

  // Manter apenas os últimos 100 eventos
  if (superPayRealtimeEvents.length > 100) {
    superPayRealtimeEvents.splice(100)
  }

  // Limpar tokens expirados periodicamente
  cleanExpiredTokens()

  return confirmationData
}

function getSuperPayPaymentConfirmation(identifier: string): SuperPayPaymentConfirmation | null {
  // Buscar por external_id
  let confirmation = superPayPaymentConfirmations.get(identifier)
  if (confirmation) {
    // Verificar se token não expirou
    if (!isTokenExpired(confirmation.expiresAt)) {
      return confirmation
    } else {
      // Token expirado, remover
      superPayPaymentConfirmations.delete(identifier)
      return null
    }
  }

  // Buscar por invoice_id
  confirmation = superPayPaymentConfirmations.get(identifier)
  if (confirmation) {
    if (!isTokenExpired(confirmation.expiresAt)) {
      return confirmation
    } else {
      superPayPaymentConfirmations.delete(identifier)
      return null
    }
  }

  // Buscar por token
  confirmation = superPayPaymentConfirmations.get(`token_${identifier}`)
  if (confirmation) {
    if (!isTokenExpired(confirmation.expiresAt)) {
      return confirmation
    } else {
      superPayPaymentConfirmations.delete(`token_${identifier}`)
      return null
    }
  }

  return null
}

function getAllSuperPayConfirmations(): SuperPayPaymentConfirmation[] {
  const confirmations: SuperPayPaymentConfirmation[] = []
  const seen = new Set<string>()

  for (const [key, value] of superPayPaymentConfirmations.entries()) {
    if (!seen.has(value.externalId) && !isTokenExpired(value.expiresAt)) {
      confirmations.push(value)
      seen.add(value.externalId)
    }
  }

  return confirmations.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
}

function getSuperPayRealtimeEvents(): any[] {
  return [...superPayRealtimeEvents]
}

// Função para limpar tokens expirados
function cleanExpiredTokens() {
  const now = new Date()
  const keysToDelete: string[] = []

  for (const [key, value] of superPayPaymentConfirmations.entries()) {
    if (isTokenExpired(value.expiresAt)) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach((key) => {
    superPayPaymentConfirmations.delete(key)
  })

  if (keysToDelete.length > 0) {
    console.log(`🧹 Limpeza SuperPay: ${keysToDelete.length} tokens expirados removidos`)
  }
}

// Executar limpeza a cada 5 minutos
setInterval(cleanExpiredTokens, 5 * 60 * 1000)

export {
  type SuperPayPaymentConfirmation,
  type SuperPayWebhookPayload,
  SUPERPAY_STATUS_CODES,
  saveSuperPayPaymentConfirmation,
  getSuperPayPaymentConfirmation,
  getAllSuperPayConfirmations,
  getSuperPayRealtimeEvents,
  generateSecureToken,
  isTokenExpired,
  cleanExpiredTokens,
  superPayPaymentConfirmations,
  superPayRealtimeEvents,
}
