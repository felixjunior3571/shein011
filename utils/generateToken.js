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
 * Calcula timestamp de expiração (15 minutos a partir de agora)
 * @returns {Date} Data de expiração
 */
function getExpirationTime() {
  const now = new Date()
  return new Date(now.getTime() + 15 * 60 * 1000) // 15 minutos
}

module.exports = {
  generateSecureToken,
  generateExternalId,
  getExpirationTime,
}
