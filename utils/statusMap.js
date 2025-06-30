/**
 * Mapeamento dos códigos de status da SuperPay para mensagens amigáveis
 */
const STATUS_CODES = {
  1: "aguardando", // Aguardando pagamento
  2: "processando", // Processando
  3: "aguardando", // Aguardando confirmação
  4: "processando", // Em análise
  5: "pago", // Pago/Aprovado
  6: "recusado", // Recusado
  7: "cancelado", // Cancelado
  8: "estornado", // Estornado
  9: "vencido", // Vencido
}

/**
 * Mensagens amigáveis para o frontend
 */
const STATUS_MESSAGES = {
  pendente: {
    message: "Aguardando pagamento",
    description: "Escaneie o QR Code ou cole o código PIX no seu banco",
    action: "continue_waiting",
  },
  aguardando: {
    message: "Aguardando confirmação",
    description: "Pagamento detectado, aguardando confirmação do banco",
    action: "continue_waiting",
  },
  processando: {
    message: "Processando pagamento",
    description: "Seu pagamento está sendo processado",
    action: "continue_waiting",
  },
  pago: {
    message: "Pagamento confirmado!",
    description: "Seu pagamento foi aprovado com sucesso",
    action: "redirect_success",
  },
  recusado: {
    message: "Pagamento recusado",
    description: "O pagamento foi recusado pelo banco. Tente novamente.",
    action: "show_error",
  },
  cancelado: {
    message: "Pagamento cancelado",
    description: "O pagamento foi cancelado",
    action: "show_error",
  },
  estornado: {
    message: "Pagamento estornado",
    description: "O pagamento foi estornado",
    action: "show_error",
  },
  vencido: {
    message: "Pagamento vencido",
    description: "O prazo para pagamento expirou. Gere um novo PIX.",
    action: "show_error",
  },
}

/**
 * Converte código numérico da SuperPay para status interno
 * @param {number} statusCode - Código da SuperPay
 * @returns {string} Status interno
 */
function mapStatusCode(statusCode) {
  return STATUS_CODES[statusCode] || "aguardando"
}

/**
 * Obtém mensagem amigável para um status
 * @param {string} status - Status interno
 * @returns {object} Objeto com mensagem e ação
 */
function getStatusMessage(status) {
  return STATUS_MESSAGES[status] || STATUS_MESSAGES.aguardando
}

/**
 * Verifica se o status indica pagamento aprovado
 * @param {string} status - Status interno
 * @returns {boolean} True se pago
 */
function isPaidStatus(status) {
  return status === "pago"
}

/**
 * Verifica se o status indica erro/falha
 * @param {string} status - Status interno
 * @returns {boolean} True se erro
 */
function isErrorStatus(status) {
  return ["recusado", "cancelado", "estornado", "vencido"].includes(status)
}

module.exports = {
  STATUS_CODES,
  STATUS_MESSAGES,
  mapStatusCode,
  getStatusMessage,
  isPaidStatus,
  isErrorStatus,
}
