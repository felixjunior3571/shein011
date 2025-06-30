const crypto = require("crypto")

/**
 * Gera um token seguro para verificação de status
 * @param {string} externalId - ID externo da fatura
 * @returns {string} Token seguro
 */
function generateSecureToken(externalId) {
  const timestamp = Date.now().toString()
  const randomBytes = crypto.randomBytes(16).toString("hex")
  const data = `${externalId}_${timestamp}_${randomBytes}`

  // Criar hash SHA256 do token
  const hash = crypto.createHash("sha256").update(data).digest("hex")

  // Retornar apenas os primeiros 32 caracteres para facilitar uso
  return hash.substring(0, 32)
}

/**
 * Gera external_id único no formato FRETE_timestamp_random
 * @returns {string} External ID único
 */
function generateExternalId() {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `FRETE_${timestamp}_${random}`
}

/**
 * Verifica se um token é válido (não expirado)
 * @param {Date} expiresAt - Data de expiração
 * @returns {boolean} True se válido
 */
function isTokenValid(expiresAt) {
  return new Date() < new Date(expiresAt)
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
 * Mapeia código de status da SuperPayBR para status interno
 * @param {number} statusCode - Código do status da SuperPayBR
 * @returns {string} Status interno
 */
function mapStatusCode(statusCode) {
  const statusMap = {
    1: "pendente", // Aguardando pagamento
    2: "pendente", // Em processamento
    3: "pendente", // Aguardando confirmação
    4: "pendente", // Em análise
    5: "pago", // Pagamento confirmado
    6: "recusado", // Pagamento recusado
    7: "cancelado", // Pagamento cancelado
    8: "estornado", // Pagamento estornado
    9: "vencido", // Pagamento vencido
  }

  return statusMap[statusCode] || "desconhecido"
}

/**
 * Verifica se o status indica pagamento bem-sucedido
 * @param {string} status - Status da fatura
 * @returns {boolean} True se pago
 */
function isPaymentSuccessful(status) {
  return status === "pago"
}

/**
 * Verifica se o status indica falha no pagamento
 * @param {string} status - Status da fatura
 * @returns {boolean} True se falhou
 */
function isPaymentFailed(status) {
  return ["recusado", "cancelado", "estornado", "vencido"].includes(status)
}

/**
 * Gera mensagem amigável baseada no status
 * @param {string} status - Status da fatura
 * @returns {string} Mensagem amigável
 */
function getStatusMessage(status) {
  const messages = {
    pendente: "Aguardando pagamento",
    pago: "Pagamento confirmado com sucesso!",
    recusado: "Pagamento recusado. Tente novamente.",
    cancelado: "Pagamento cancelado.",
    estornado: "Pagamento estornado.",
    vencido: "Pagamento vencido. Gere um novo PIX.",
    desconhecido: "Status desconhecido. Entre em contato com o suporte.",
  }

  return messages[status] || messages["desconhecido"]
}

module.exports = {
  generateSecureToken,
  generateExternalId,
  isTokenValid,
  getExpirationDate,
  mapStatusCode,
  isPaymentSuccessful,
  isPaymentFailed,
  getStatusMessage,
}
