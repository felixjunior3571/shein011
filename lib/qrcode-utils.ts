// QR Code utilities for SuperPayBR integration

export interface QRCodeData {
  qr_code?: string
  qrcode?: string
  url?: string
  image?: string
  pix_code?: string
  bruto?: string
  liquido?: string
  invoice_id?: string
  status?: string
}

export interface ProcessedQRCodeData {
  qrCodeUrl: string | null
  pixCode: string | null
  amount: string | null
  invoiceId: string | null
  status: string
  source: "api" | "generated" | "fallback"
}

/**
 * Process QR Code data from SuperPayBR API response
 */
export function processQRCodeData(data: any): ProcessedQRCodeData {
  try {
    // Log the incoming data for debugging
    logQRCodeEvent("Processing QR Code data", { data })

    // Extract QR code URL from various possible fields
    const qrCodeUrl = data?.qr_code || data?.qrcode || data?.url || data?.image || null

    // Extract PIX code
    const pixCode = data?.pix_code || data?.codigo_pix || null

    // Extract amount information
    const amount = data?.bruto || data?.liquido || data?.valor || data?.amount || null

    // Extract invoice ID
    const invoiceId = data?.invoice_id || data?.id || data?.fatura_id || null

    // Extract status
    const status = data?.status || data?.situacao || "unknown"

    const result: ProcessedQRCodeData = {
      qrCodeUrl,
      pixCode,
      amount,
      invoiceId,
      status,
      source: qrCodeUrl ? "api" : "fallback",
    }

    logQRCodeEvent("QR Code data processed", result)
    return result
  } catch (error) {
    logQRCodeEvent("Error processing QR Code data", {
      error: error instanceof Error ? error.message : "Unknown error",
      data,
    })

    return {
      qrCodeUrl: null,
      pixCode: null,
      amount: null,
      invoiceId: null,
      status: "error",
      source: "fallback",
    }
  }
}

/**
 * Log QR Code related events for debugging
 */
export function logQRCodeEvent(event: string, data?: any): void {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    event,
    ...data,
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[QR Code Utils] ${event}:`, data)
  }

  // In production, you might want to send to a logging service
  // For now, we'll just use console.log
  console.log(`[QR Code Utils] ${timestamp} - ${event}`, data)
}

/**
 * Validate if a URL is a valid image URL
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    const validDomains = ["api.superpaybr.com", "superpaybr.com", "quickchart.io", "chart.googleapis.com"]

    return validDomains.some((domain) => urlObj.hostname.includes(domain))
  } catch {
    return false
  }
}

/**
 * Generate a fallback QR code using QuickChart.io
 */
export function generateFallbackQRCode(pixCode: string): string {
  if (!pixCode) {
    return "/placeholder.svg?height=200&width=200&text=QR+Code+Indisponível"
  }

  const encodedPixCode = encodeURIComponent(pixCode)
  return `https://quickchart.io/qr?text=${encodedPixCode}&size=200`
}

/**
 * Extract PIX code from various data formats
 */
export function extractPixCode(data: any): string | null {
  // Try different possible field names for PIX code
  const possibleFields = ["pix_code", "codigo_pix", "qr_code_text", "pix_copia_cola", "codigo", "payload"]

  for (const field of possibleFields) {
    if (data?.[field] && typeof data[field] === "string") {
      return data[field]
    }
  }

  return null
}

/**
 * Format amount for display
 */
export function formatAmount(amount: string | number | null): string {
  if (!amount) return "R$ 0,00"

  const numAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount

  if (isNaN(numAmount)) return "R$ 0,00"

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numAmount)
}

/**
 * Check if QR code data is valid and complete
 */
export function isValidQRCodeData(data: ProcessedQRCodeData): boolean {
  return !!(data.qrCodeUrl || data.pixCode)
}

/**
 * Create emergency QR code with basic information
 */
export function createEmergencyQRCode(invoiceId?: string): ProcessedQRCodeData {
  logQRCodeEvent("Creating emergency QR code", { invoiceId })

  return {
    qrCodeUrl: "/placeholder.svg?height=200&width=200&text=QR+Code+Temporariamente+Indisponível",
    pixCode: null,
    amount: null,
    invoiceId: invoiceId || null,
    status: "emergency",
    source: "fallback",
  }
}
