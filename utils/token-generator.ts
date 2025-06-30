import { randomBytes } from "crypto"

export function generateExternalId(): string {
  const timestamp = Date.now()
  const random = randomBytes(4).toString("hex")
  return `FRETE_${timestamp}_${random}`
}

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex")
}

export function getExpirationTime(minutes = 15): Date {
  const now = new Date()
  now.setMinutes(now.getMinutes() + minutes)
  return now
}

export function isTokenExpired(expires_at: string): boolean {
  return new Date() > new Date(expires_at)
}

export function isPaymentSuccessful(status: string): boolean {
  return status === "pago"
}

export function isPaymentFailed(status: string): boolean {
  return ["recusado", "cancelado", "estornado", "vencido"].includes(status)
}
