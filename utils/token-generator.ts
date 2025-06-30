import crypto from "crypto"

export function generateSecureToken(): string {
  // Gera um token seguro de 32 caracteres
  return crypto.randomBytes(16).toString("hex")
}

export function generateExternalId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `FRETE_${timestamp}_${random}`
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date() > new Date(expiresAt)
}

export function getExpirationTime(minutes = 15): Date {
  const now = new Date()
  return new Date(now.getTime() + minutes * 60 * 1000)
}
