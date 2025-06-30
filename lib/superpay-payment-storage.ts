"use client"

// SuperPay Status Codes baseado na documentação oficial
export const SUPERPAY_STATUS_CODES = {
  1: {
    name: "Aguardando Pagamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  2: {
    name: "Em Processamento",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  3: { name: "Processando", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  4: { name: "Aprovado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  5: { name: "Pago", isPaid: true, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  6: { name: "Cancelado", isPaid: false, isDenied: false, isExpired: false, isCanceled: true, isRefunded: false },
  7: { name: "Contestado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  8: { name: "Chargeback", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  9: { name: "Estornado", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: true },
  10: { name: "Falha", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  11: { name: "Bloqueado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  12: { name: "Negado", isPaid: false, isDenied: true, isExpired: false, isCanceled: false, isRefunded: false },
  13: { name: "Análise", isPaid: false, isDenied: false, isExpired: false, isCanceled: false, isRefunded: false },
  14: {
    name: "Análise Manual",
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
  },
  15: { name: "Vencido", isPaid: false, isDenied: false, isExpired: true, isCanceled: false, isRefunded: false },
} as const

// Interface para o payload do webhook SuperPay
export interface SuperPayWebhookPayload {
  event: {
    type: string
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
      card: any | null
      payId: string | null
      payDate: string
      details: {
        barcode: string | null
        pix_code: string | null
        qrcode: string
        url: string | null
      }
    }
  }
}

// Interface para confirmação de pagamento
export interface SuperPayPaymentConfirmation {
  externalId: string
  invoiceId: string
  token: string
  statusCode: number
  statusName: string
  statusDescription: string
  amount: number
  paymentDate: string | null
  receivedAt: string
  expiresAt: string
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
}

// Map global para armazenar confirmações em memória
const superPayConfirmations = new Map<string, SuperPayPaymentConfirmation>()

// Eventos em tempo real
const superPayRealtimeEvents: Array<{
  timestamp: string
  type: string
  externalId: string
  statusCode: number
  statusName: string
  amount: number
}> = []

// Função para gerar token único
function generateSuperPayToken(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `SPY_${timestamp}_${random}`
}

// Função para verificar se token expirou (15 minutos)
export function isTokenExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt)
}

// Função para salvar confirmação de pagamento SuperPay
export function saveSuperPayPaymentConfirmation(
  externalId: string,
  invoiceId: string,
  token: string | null,
  data: {
    statusCode: number
    statusName: string
    statusDescription: string
    amount: number
    paymentDate: string | null
  },
): SuperPayPaymentConfirmation {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutos

  const statusInfo =
    SUPERPAY_STATUS_CODES[data.statusCode as keyof typeof SUPERPAY_STATUS_CODES] || SUPERPAY_STATUS_CODES[1]

  const confirmation: SuperPayPaymentConfirmation = {
    externalId,
    invoiceId,
    token: token || generateSuperPayToken(),
    statusCode: data.statusCode,
    statusName: data.statusName,
    statusDescription: data.statusDescription,
    amount: data.amount,
    paymentDate: data.paymentDate,
    receivedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isPaid: statusInfo.isPaid,
    isDenied: statusInfo.isDenied,
    isExpired: statusInfo.isExpired,
    isCanceled: statusInfo.isCanceled,
    isRefunded: statusInfo.isRefunded,
  }

  // Salvar na memória com múltiplas chaves para facilitar busca
  superPayConfirmations.set(externalId, confirmation)
  superPayConfirmations.set(invoiceId, confirmation)
  if (confirmation.token) {
    superPayConfirmations.set(confirmation.token, confirmation)
  }

  // Adicionar evento em tempo real
  superPayRealtimeEvents.unshift({
    timestamp: now.toISOString(),
    type: `status_${data.statusCode}`,
    externalId,
    statusCode: data.statusCode,
    statusName: data.statusName,
    amount: data.amount,
  })

  // Manter apenas os últimos 100 eventos
  if (superPayRealtimeEvents.length > 100) {
    superPayRealtimeEvents.splice(100)
  }

  console.log(`💾 SuperPay confirmação salva na memória:`, {
    external_id: externalId,
    token: confirmation.token,
    status: data.statusName,
    expires_at: confirmation.expiresAt,
  })

  return confirmation
}

// Função para obter confirmação de pagamento SuperPay
export function getSuperPayPaymentConfirmation(identifier: string): SuperPayPaymentConfirmation | null {
  const confirmation = superPayConfirmations.get(identifier)

  if (!confirmation) {
    return null
  }

  // Verificar se token expirou
  if (isTokenExpired(confirmation.expiresAt)) {
    // Remover da memória se expirou
    superPayConfirmations.delete(confirmation.externalId)
    superPayConfirmations.delete(confirmation.invoiceId)
    if (confirmation.token) {
      superPayConfirmations.delete(confirmation.token)
    }
    return null
  }

  return confirmation
}

// Função para obter todas as confirmações SuperPay (para debug)
export function getAllSuperPayConfirmations(): SuperPayPaymentConfirmation[] {
  const now = new Date()
  const validConfirmations: SuperPayPaymentConfirmation[] = []
  const expiredKeys: string[] = []

  // Filtrar confirmações válidas e identificar expiradas
  for (const [key, confirmation] of superPayConfirmations.entries()) {
    if (isTokenExpired(confirmation.expiresAt)) {
      expiredKeys.push(key)
    } else if (!validConfirmations.find((c) => c.externalId === confirmation.externalId)) {
      // Evitar duplicatas (já que salvamos com múltiplas chaves)
      validConfirmations.push(confirmation)
    }
  }

  // Remover confirmações expiradas
  expiredKeys.forEach((key) => superPayConfirmations.delete(key))

  return validConfirmations.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
}

// Função para obter eventos em tempo real SuperPay
export function getSuperPayRealtimeEvents() {
  return superPayRealtimeEvents.slice(0, 50) // Últimos 50 eventos
}

// Função para limpar confirmações expiradas (executar periodicamente)
export function cleanupExpiredSuperPayConfirmations(): number {
  const now = new Date()
  let cleanedCount = 0
  const keysToDelete: string[] = []

  for (const [key, confirmation] of superPayConfirmations.entries()) {
    if (isTokenExpired(confirmation.expiresAt)) {
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach((key) => {
    superPayConfirmations.delete(key)
    cleanedCount++
  })

  if (cleanedCount > 0) {
    console.log(`🧹 SuperPay: ${cleanedCount} confirmações expiradas removidas da memória`)
  }

  return cleanedCount
}

// Executar limpeza a cada 5 minutos
if (typeof window !== "undefined") {
  setInterval(cleanupExpiredSuperPayConfirmations, 5 * 60 * 1000)
}

// Função para obter estatísticas SuperPay
export function getSuperPayStats() {
  const confirmations = getAllSuperPayConfirmations()

  return {
    total: confirmations.length,
    paid: confirmations.filter((c) => c.isPaid).length,
    denied: confirmations.filter((c) => c.isDenied).length,
    expired: confirmations.filter((c) => c.isExpired).length,
    canceled: confirmations.filter((c) => c.isCanceled).length,
    refunded: confirmations.filter((c) => c.isRefunded).length,
    pending: confirmations.filter((c) => !c.isPaid && !c.isDenied && !c.isExpired && !c.isCanceled).length,
    totalAmount: confirmations.reduce((sum, c) => sum + c.amount, 0),
    paidAmount: confirmations.filter((c) => c.isPaid).reduce((sum, c) => sum + c.amount, 0),
    events: superPayRealtimeEvents.length,
  }
}
