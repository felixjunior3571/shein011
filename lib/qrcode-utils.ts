/**
 * Utilitários para processamento de QR Codes PIX - SuperPayBR
 */

export interface QRCodeData {
  qr_code?: string
  image?: string
  url?: string
  pix_code?: string
  payload?: string
}

export interface ProcessedQRCodeData {
  qrCodeUrl: string | null
  pixCode: string | null
  imageUrl: string | null
  isValid: boolean
  source: string
  error?: string
}

/**
 * Processa dados de QR Code da API SuperPayBR
 */
export function processQRCodeData(data: any): ProcessedQRCodeData {
  console.log("🔄 Processando dados QR Code SuperPayBR:", data)

  try {
    // Extrair URLs possíveis
    const qrCodeUrl = data?.qr_code || data?.url || data?.image || null
    const pixCode = data?.pix_code || data?.payload || null
    const imageUrl = data?.image || data?.qr_code || null

    // Validar se temos pelo menos uma URL válida
    const isValid = !!(qrCodeUrl || pixCode)

    const result: ProcessedQRCodeData = {
      qrCodeUrl,
      pixCode,
      imageUrl,
      isValid,
      source: "superpaybr_api",
    }

    console.log("✅ Dados QR Code processados:", result)
    return result
  } catch (error) {
    console.error("❌ Erro ao processar dados QR Code:", error)
    return {
      qrCodeUrl: null,
      pixCode: null,
      imageUrl: null,
      isValid: false,
      source: "error",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

/**
 * Registra eventos de QR Code para debugging
 */
export function logQRCodeEvent(event: string, data: any) {
  const timestamp = new Date().toISOString()
  console.log(`[QR-CODE-${event.toUpperCase()}] ${timestamp}:`, data)

  // Salvar no localStorage para debug (apenas em desenvolvimento)
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const logs = JSON.parse(localStorage.getItem("qrcode_debug_logs") || "[]")
    logs.push({
      event,
      data,
      timestamp,
    })
    // Manter apenas os últimos 50 logs
    if (logs.length > 50) {
      logs.splice(0, logs.length - 50)
    }
    localStorage.setItem("qrcode_debug_logs", JSON.stringify(logs))
  }
}

/**
 * Valida se uma URL de imagem é válida
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "http:" || urlObj.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Gera QR Code de fallback usando QuickChart.io
 */
export function generateFallbackQRCode(pixCode: string): string {
  if (!pixCode) {
    return "/placeholder.svg?height=200&width=200"
  }

  const encodedPixCode = encodeURIComponent(pixCode)
  return `https://quickchart.io/qr?text=${encodedPixCode}&size=200`
}

/**
 * Extrai código PIX de diferentes formatos de dados
 */
export function extractPixCode(data: any): string | null {
  // Tentar diferentes campos onde o código PIX pode estar
  const possibleFields = ["pix_code", "payload", "pix", "code", "qr_code_text"]

  for (const field of possibleFields) {
    if (data?.[field] && typeof data[field] === "string") {
      return data[field]
    }
  }

  return null
}

/**
 * Formata valor monetário em Real brasileiro
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)
}

/**
 * Cria QR Code de emergência com dados básicos
 */
export function createEmergencyQRCode(amount: number): {
  qr_code: string
  payload: string
  type: "emergency"
} {
  const timestamp = Date.now()
  const emergencyPayload = `00020101021226580014br.gov.bcb.pix2536emergency.superpaybr.com/qr/v2/EMG${timestamp}520400005303986540${amount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

  return {
    qr_code: generateFallbackQRCode(emergencyPayload),
    payload: emergencyPayload,
    type: "emergency",
  }
}

/**
 * Obtém QR Code da SuperPayBR com fallbacks
 */
export async function getQRCodeFromSuperPayBR(invoiceId: string): Promise<ProcessedQRCodeData> {
  logQRCodeEvent("fetch_start", { invoiceId })

  try {
    // Primeira tentativa: API SuperPayBR v4
    const response = await fetch(`/api/superpaybr/get-qrcode?invoiceId=${invoiceId}`)
    const data = await response.json()

    logQRCodeEvent("api_response", { status: response.status, data })

    if (data.success && data.data) {
      const processed = processQRCodeData(data.data)
      logQRCodeEvent("process_success", processed)
      return processed
    } else {
      throw new Error(data.error || "Falha na API SuperPayBR")
    }
  } catch (error) {
    logQRCodeEvent("fetch_error", { error: error instanceof Error ? error.message : error })

    // Retornar dados de erro
    return {
      qrCodeUrl: null,
      pixCode: null,
      imageUrl: null,
      isValid: false,
      source: "error",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
