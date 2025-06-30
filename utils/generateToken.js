const crypto = require("crypto")

// Gerar external_id único no formato FRETE_timestamp_random
function generateExternalId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `FRETE_${timestamp}_${random}`
}

// Gerar token seguro para verificação
function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex")
}

// Gerar token JWT-like (opcional, mais seguro)
function generateJWTLikeToken(payload = {}) {
  const header = {
    typ: "JWT",
    alg: "HS256",
  }

  const data = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutos
  }

  const headerEncoded = Buffer.from(JSON.stringify(header)).toString("base64url")
  const payloadEncoded = Buffer.from(JSON.stringify(data)).toString("base64url")

  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "superpay-secret-key")
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest("base64url")

  return `${headerEncoded}.${payloadEncoded}.${signature}`
}

// Verificar se token JWT-like é válido
function verifyJWTLikeToken(token) {
  try {
    const [headerEncoded, payloadEncoded, signature] = token.split(".")

    if (!headerEncoded || !payloadEncoded || !signature) {
      return { valid: false, error: "Token malformado" }
    }

    // Verificar assinatura
    const expectedSignature = crypto
      .createHmac("sha256", process.env.JWT_SECRET || "superpay-secret-key")
      .update(`${headerEncoded}.${payloadEncoded}`)
      .digest("base64url")

    if (signature !== expectedSignature) {
      return { valid: false, error: "Assinatura inválida" }
    }

    // Decodificar payload
    const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString())

    // Verificar expiração
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: "Token expirado" }
    }

    return { valid: true, payload }
  } catch (error) {
    return { valid: false, error: "Erro ao verificar token" }
  }
}

// Validar formato do external_id
function isValidExternalId(externalId) {
  const pattern = /^FRETE_\d+_[A-Z0-9]+$/
  return pattern.test(externalId)
}

// Gerar hash para webhook validation
function generateWebhookHash(data, secret) {
  return crypto.createHmac("sha256", secret).update(JSON.stringify(data)).digest("hex")
}

// Verificar hash do webhook
function verifyWebhookHash(data, receivedHash, secret) {
  const expectedHash = generateWebhookHash(data, secret)
  return crypto.timingSafeEqual(Buffer.from(receivedHash, "hex"), Buffer.from(expectedHash, "hex"))
}

// Função para verificar se pagamento foi bem-sucedido
function isPaymentSuccessful(statusCode) {
  return statusCode === 5 || statusCode === "5"
}

// Função para verificar se pagamento falhou
function isPaymentFailed(statusCode) {
  const failedCodes = [6, 7, 8, 9, "6", "7", "8", "9"]
  return failedCodes.includes(statusCode)
}

module.exports = {
  generateExternalId,
  generateSecureToken,
  generateJWTLikeToken,
  verifyJWTLikeToken,
  isValidExternalId,
  generateWebhookHash,
  verifyWebhookHash,
  isPaymentSuccessful,
  isPaymentFailed,
}
