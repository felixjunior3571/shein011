const crypto = require("crypto")

/**
 * Gera um token seguro para verificação de status
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Gera external_id único no formato FRETE_timestamp_random
 */
function generateExternalId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `FRETE_${timestamp}_${random}`
}

/**
 * Mapeia códigos de status da SuperPay para status internos
 */
function mapSuperpayStatus(statusCode) {
  const statusMap = {
    1: "pendente", // Aguardando pagamento
    2: "processando", // Processando
    3: "pendente", // Aguardando
    4: "processando", // Em análise
    5: "pago", // Pago/Aprovado
    6: "recusado", // Recusado
    7: "cancelado", // Cancelado
    8: "estornado", // Estornado
    9: "vencido", // Vencido/Expirado
    10: "cancelado", // Cancelado pelo usuário
  }

  return statusMap[statusCode] || "desconhecido"
}

/**
 * Verifica se o token está expirado (15 minutos)
 */
function isTokenExpired(createdAt) {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMinutes = (now - created) / (1000 * 60)

  return diffMinutes > 15
}

/**
 * Verifica se o pagamento foi bem-sucedido
 */
function isPaymentSuccessful(status) {
  return status === "pago"
}

/**
 * Verifica se o pagamento falhou
 */
function isPaymentFailed(status) {
  return ["recusado", "cancelado", "estornado", "vencido"].includes(status)
}

/**
 * Formata resposta de erro padronizada
 */
function formatErrorResponse(message, code = "ERROR", details = null) {
  return {
    success: false,
    error: message,
    code: code,
    details: details,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Formata resposta de sucesso padronizada
 */
function formatSuccessResponse(data, message = "Sucesso") {
  return {
    success: true,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Valida dados obrigatórios do checkout
 */
function validateCheckoutData(data) {
  const required = ["amount"]
  const missing = required.filter((field) => !data[field])

  if (missing.length > 0) {
    throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`)
  }

  if (data.amount <= 0) {
    throw new Error("Valor deve ser maior que zero")
  }

  if (data.amount > 10000) {
    throw new Error("Valor máximo excedido (R$ 10.000)")
  }

  return true
}

/**
 * Gera dados completos para nova fatura
 */
function generateFaturaData(inputData) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutos

  return {
    external_id: generateExternalId(),
    token: generateSecureToken(),
    status: "pendente",
    amount: Number.parseFloat(inputData.amount),
    customer_name: inputData.customer_name || "Cliente SHEIN",
    customer_email: inputData.customer_email || "cliente@shein.com",
    customer_phone: inputData.customer_phone || "",
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    redirect_url: inputData.redirect_url || "/obrigado",
  }
}

module.exports = {
  generateSecureToken,
  generateExternalId,
  mapSuperpayStatus,
  isTokenExpired,
  isPaymentSuccessful,
  isPaymentFailed,
  formatErrorResponse,
  formatSuccessResponse,
  validateCheckoutData,
  generateFaturaData,
}
