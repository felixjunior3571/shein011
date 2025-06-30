/**
 * Mapeia códigos de status da SuperPayBR para status internos e mensagens
 */
const STATUS_MAP = {
  1: { status: "pendente", message: "Aguardando pagamento" },
  2: { status: "pendente", message: "Aguardando pagamento" },
  3: { status: "pendente", message: "Aguardando pagamento" },
  4: { status: "pendente", message: "Aguardando pagamento" },
  5: { status: "pago", message: "Pagamento confirmado" },
  6: { status: "recusado", message: "Pagamento recusado" },
  7: { status: "cancelado", message: "Pagamento cancelado" },
  8: { status: "estornado", message: "Pagamento estornado" },
  9: { status: "vencido", message: "Pagamento vencido" },
}

/**
 * Converte código de status da SuperPay para status interno
 * @param {number} statusCode - Código de status da SuperPay
 * @returns {object} Objeto com status e mensagem
 */
function mapStatus(statusCode) {
  return (
    STATUS_MAP[statusCode] || {
      status: "desconhecido",
      message: "Status desconhecido",
    }
  )
}

/**
 * Verifica se o status indica pagamento aprovado
 * @param {number} statusCode - Código de status da SuperPay
 * @returns {boolean} True se pago
 */
function isPaid(statusCode) {
  return statusCode === 5
}

/**
 * Verifica se o status indica falha/erro
 * @param {number} statusCode - Código de status da SuperPay
 * @returns {boolean} True se falhou
 */
function isFailed(statusCode) {
  return [6, 7, 8, 9].includes(statusCode)
}

module.exports = {
  mapStatus,
  isPaid,
  isFailed,
  STATUS_MAP,
}
