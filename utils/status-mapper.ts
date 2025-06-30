export interface StatusInfo {
  code: number
  status: string
  message: string
  isPaid: boolean
  isError: boolean
}

export const STATUS_MAP: Record<number, StatusInfo> = {
  1: {
    code: 1,
    status: "pendente",
    message: "Aguardando pagamento",
    isPaid: false,
    isError: false,
  },
  5: {
    code: 5,
    status: "pago",
    message: "Pagamento confirmado",
    isPaid: true,
    isError: false,
  },
  6: {
    code: 6,
    status: "recusado",
    message: "Pagamento recusado",
    isPaid: false,
    isError: true,
  },
  7: {
    code: 7,
    status: "cancelado",
    message: "Pagamento cancelado",
    isPaid: false,
    isError: true,
  },
  8: {
    code: 8,
    status: "estornado",
    message: "Pagamento estornado",
    isPaid: false,
    isError: true,
  },
  9: {
    code: 9,
    status: "vencido",
    message: "Pagamento vencido",
    isPaid: false,
    isError: true,
  },
}

export function mapStatusCode(code: number): StatusInfo {
  return (
    STATUS_MAP[code] || {
      code,
      status: "desconhecido",
      message: "Status desconhecido",
      isPaid: false,
      isError: true,
    }
  )
}

export function getStatusMessage(status: string): string {
  const statusEntry = Object.values(STATUS_MAP).find((s) => s.status === status)
  return statusEntry?.message || "Status desconhecido"
}
