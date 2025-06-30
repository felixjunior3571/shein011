const crypto = require("crypto")

/**
 * Gera um token seguro e único para verificação de pagamento
 * @returns {string} Token seguro de 32 caracteres
 */
function generateSecureToken() {
  return crypto.randomBytes(16).toString("hex")
}

/**
 * Gera um external_id único no formato FRETE_timestamp_random
 * @returns {string} External ID único
 */
function generateExternalId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString("hex")
  return `FRETE_${timestamp}_${random}`
}

/**
 * Calcula data de expiração (15 minutos a partir de agora)
 * @returns {Date} Data de expiração
 */
function getExpirationDate() {
  const now = new Date()
  return new Date(now.getTime() + 15 * 60 * 1000) // 15 minutos
}

/**
 * Verifica se um token expirou
 * @param {Date} expiresAt - Data de expiração
 * @returns {boolean} True se expirou
 */
function isTokenExpired(expiresAt) {
  return new Date() > new Date(expiresAt)
}

module.exports = {
  generateSecureToken,
  generateExternalId,
  getExpirationDate,
  isTokenExpired,
}
