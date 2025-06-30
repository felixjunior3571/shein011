const crypto = require("crypto")

/**
 * Gera um external_id único no formato FRETE_timestamp_random
 */
function generateExternalId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `FRETE_${timestamp}_${random}`
}

/**
 * Gera um token seguro para verificação de status
 * Token válido por 15 minutos
 */
function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Gera timestamp de expiração (15 minutos a partir de agora)
 */
function generateExpirationTime() {
  const now = new Date()
  const expiration = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutos
  return expiration.toISOString()
}

/**
 * Verifica se um token está expirado
 */
function isTokenExpired(expiresAt) {
  const now = new Date()
  const expiration = new Date(expiresAt)
  return now > expiration
}

/**
 * Gera hash para validação de webhook
 */
function generateWebhookHash(payload, secret) {
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex")
}

/**
 * Valida hash do webhook
 */
function validateWebhookHash(payload, receivedHash, secret) {
  const expectedHash = generateWebhookHash(payload, secret)
  return crypto.timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(expectedHash, "hex"))
}

/**
 * Gera dados completos para nova fatura
 */
function generateFaturaData(amount = 10.0, redirectUrl = "/obrigado") {
  return {
    external_id: generateExternalId(),
    token: generateSecureToken(),
    status: "pendente",
    expires_at: generateExpirationTime(),
    redirect_url: redirectUrl,
    amount: amount,
    created_at: new Date().toISOString(),
  }
}

/**
 * Mapeia códigos de status da SuperPayBR
 */
function mapSuperpayStatus(statusCode) {
  const statusMap = {
    5: "pago",
    6: "recusado",
    7: "cancelado",
    8: "estornado",
    9: "vencido",
  }

  return statusMap[statusCode] || "pendente"
}

/**
 * Verifica se o pagamento foi bem-sucedido
 */
function isPaymentSuccessful(status) {
  return status === "pago" || status === 5
}

/**
 * Verifica se o pagamento falhou
 */
function isPaymentFailed(status) {
  const failedStatuses = ["recusado", "cancelado", "estornado", "vencido"]
  return failedStatuses.includes(status) || [6, 7, 8, 9].includes(status)
}

/**
 * Formata resposta de erro padronizada
 */
function formatErrorResponse(message, code = "GENERIC_ERROR", details = null) {
  return {
    error: message,
    code: code,
    timestamp: new Date().toISOString(),
    details: details,
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

module.exports = {
  generateExternalId,
  generateSecureToken,
  generateExpirationTime,
  isTokenExpired,
  generateWebhookHash,
  validateWebhookHash,
  generateFaturaData,
  mapSuperpayStatus,
  isPaymentSuccessful,
  isPaymentFailed,
  formatErrorResponse,
  formatSuccessResponse,
}
