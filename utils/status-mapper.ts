export const STATUS_CODES = {
  1: "pendente",
  2: "processando",
  3: "aguardando",
  4: "em_analise",
  5: "pago",
  6: "recusado",
  7: "cancelado",
  8: "estornado",
  9: "vencido",
} as const

export const STATUS_MESSAGES = {
  pendente: "Aguardando pagamento",
  processando: "Processando pagamento",
  aguardando: "Aguardando confirmação",
  em_analise: "Em análise",
  pago: "Pagamento confirmado",
  recusado: "Pagamento recusado",
  cancelado: "Pagamento cancelado",
  estornado: "Pagamento estornado",
  vencido: "Pagamento vencido",
} as const

export function mapStatusCode(code: number): string {
  return STATUS_CODES[code as keyof typeof STATUS_CODES] || "desconhecido"
}

export function getStatusMessage(status: string): string {
  return STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES] || "Status desconhecido"
}

export function isPaymentSuccessful(status: string): boolean {
  return status === "pago"
}

export function isPaymentFailed(status: string): boolean {
  return ["recusado", "cancelado", "estornado", "vencido"].includes(status)
}
