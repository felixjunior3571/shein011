"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PaymentData {
  external_id: string
  invoice_id: string
  token: string
  status_code: number
  status_title: string
  status_description: string
  status_text: string
  amount: number
  payment_date?: string
  payment_due?: string
  payment_gateway?: string
  qr_code?: string
  processed_at: string
  updated_at: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  gateway: string
  webhook_data?: any
}

interface UseSuperpayWebhookMonitorProps {
  externalId: string | null
  gateway?: "superpaybr" | "superpay"
  enableRateLimiting?: boolean
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
  onStatusChange?: (data: PaymentData) => void
}

interface UseSuperpayWebhookMonitorReturn {
  paymentData: PaymentData | null
  isLoading: boolean
  error: string | null
  isWaitingForPayment: boolean
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  rateLimitLevel: number
  currentInterval: number
  checksCount: number
  lastCheck: Date | null
  startMonitoring: () => void
  stopMonitoring: () => void
  checkNow: () => Promise<void>
}

// Intervalos progressivos para evitar rate limiting
const RATE_LIMIT_INTERVALS = [
  3000, // 3 segundos
  5000, // 5 segundos
  10000, // 10 segundos
  30000, // 30 segundos
  60000, // 1 minuto
  120000, // 2 minutos
  300000, // 5 minutos
  600000, // 10 minutos
]

const MAX_MONITORING_TIME = 2 * 60 * 60 * 1000 // 2 horas

export function useSuperpayWebhookMonitor({
  externalId,
  gateway = "superpaybr",
  enableRateLimiting = true,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onStatusChange,
}: UseSuperpayWebhookMonitorProps): UseSuperpayWebhookMonitorReturn {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false)
  const [rateLimitLevel, setRateLimitLevel] = useState(0)
  const [checksCount, setChecksCount] = useState(0)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const lastStatusRef = useRef<PaymentData | null>(null)
  const isMonitoringRef = useRef(false)

  const currentInterval = enableRateLimiting
    ? RATE_LIMIT_INTERVALS[Math.min(rateLimitLevel, RATE_LIMIT_INTERVALS.length - 1)]
    : 3000

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[${gateway.toUpperCase()} Monitor] ${message}`, data || "")
      }
    },
    [enableDebug, gateway],
  )

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !isMonitoringRef.current) {
      log("❌ External ID não fornecido ou monitoramento parado")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      log(`🔍 Verificando status ${gateway}: ${externalId}`)

      const apiEndpoint =
        gateway === "superpaybr"
          ? `/api/superpaybr/payment-status?externalId=${encodeURIComponent(externalId)}`
          : `/api/superpay/payment-status?externalId=${encodeURIComponent(externalId)}`

      const response = await fetch(apiEndpoint, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      log("📥 Resposta da API:", result)

      if (!result.success) {
        throw new Error(result.message || "Erro ao consultar status")
      }

      const now = new Date()
      setLastCheck(now)
      setChecksCount((prev) => prev + 1)

      if (result.found && result.data) {
        const newPaymentData = result.data as PaymentData
        setPaymentData(newPaymentData)
        setIsWaitingForPayment(false)

        // Verificar mudança de status
        const statusChanged = !lastStatusRef.current || lastStatusRef.current.status_code !== newPaymentData.status_code

        if (statusChanged) {
          log(
            `🔄 Status ${gateway} alterado: ${lastStatusRef.current?.status_title || "N/A"} → ${newPaymentData.status_title}`,
          )
          lastStatusRef.current = newPaymentData

          onStatusChange?.(newPaymentData)

          // Callbacks específicos
          if (newPaymentData.is_paid) {
            log(`🎉 Pagamento confirmado via ${gateway}!`)
            onPaymentConfirmed?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_denied) {
            log(`❌ Pagamento negado via ${gateway}!`)
            onPaymentDenied?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_expired) {
            log(`⏰ Pagamento vencido via ${gateway}!`)
            onPaymentExpired?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_canceled) {
            log(`🚫 Pagamento cancelado via ${gateway}!`)
            onPaymentCanceled?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_refunded) {
            log(`🔄 Pagamento estornado via ${gateway}!`)
            onPaymentRefunded?.(newPaymentData)
            stopMonitoring()
            return
          }
        }

        // Parar se status final
        if (
          newPaymentData.is_paid ||
          newPaymentData.is_denied ||
          newPaymentData.is_expired ||
          newPaymentData.is_canceled
        ) {
          log(`🛑 Status final detectado: ${newPaymentData.status_title}`)
          stopMonitoring()
          return
        }
      } else {
        log(`⏳ Aguardando webhook ${gateway}...`)
        setIsWaitingForPayment(true)
        setPaymentData(null)

        // Aumentar intervalo gradualmente
        if (enableRateLimiting && rateLimitLevel < RATE_LIMIT_INTERVALS.length - 1) {
          setRateLimitLevel((prev) => prev + 1)
        }
      }

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log(`❌ Erro ao verificar status ${gateway}:`, errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    externalId,
    gateway,
    enableRateLimiting,
    rateLimitLevel,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onStatusChange,
    log,
  ])

  const scheduleNextCheck = useCallback(() => {
    if (!isMonitoringRef.current) return

    // Verificar tempo máximo
    if (startTimeRef.current && Date.now() - startTimeRef.current.getTime() > MAX_MONITORING_TIME) {
      log(`⏰ Tempo máximo de monitoramento ${gateway} atingido (2h)`)
      stopMonitoring()
      return
    }

    const interval = currentInterval
    log(`⏱️ Próxima verificação ${gateway} em ${interval / 1000}s`)

    intervalRef.current = setTimeout(() => {
      checkPaymentStatus().then(() => {
        if (isMonitoringRef.current) {
          scheduleNextCheck()
        }
      })
    }, interval)
  }, [currentInterval, checkPaymentStatus, gateway, log])

  const startMonitoring = useCallback(() => {
    if (!externalId) {
      log("❌ Não é possível iniciar monitoramento sem External ID")
      return
    }

    if (isMonitoringRef.current) {
      log("⚠️ Monitoramento já está ativo")
      return
    }

    log(`🚀 Iniciando monitoramento ${gateway}: ${externalId}`)

    isMonitoringRef.current = true
    startTimeRef.current = new Date()
    setIsWaitingForPayment(true)
    setError(null)
    setRateLimitLevel(0)
    setChecksCount(0)
    lastStatusRef.current = null

    checkPaymentStatus().then(() => {
      if (isMonitoringRef.current) {
        scheduleNextCheck()
      }
    })
  }, [externalId, gateway, checkPaymentStatus, scheduleNextCheck, log])

  const stopMonitoring = useCallback(() => {
    log(`🛑 Parando monitoramento ${gateway}`)

    isMonitoringRef.current = false
    setIsWaitingForPayment(false)

    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [gateway, log])

  const checkNow = useCallback(async () => {
    log(`🔄 Verificação manual ${gateway} solicitada`)
    await checkPaymentStatus()
  }, [gateway, checkPaymentStatus, log])

  // Auto-start monitoring
  useEffect(() => {
    if (
      externalId &&
      !paymentData?.is_paid &&
      !paymentData?.is_denied &&
      !paymentData?.is_expired &&
      !paymentData?.is_canceled
    ) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      isMonitoringRef.current = false
    }
  }, [])

  return {
    paymentData,
    isLoading,
    error,
    isWaitingForPayment,
    isPaid: paymentData?.is_paid || false,
    isDenied: paymentData?.is_denied || false,
    isExpired: paymentData?.is_expired || false,
    isCanceled: paymentData?.is_canceled || false,
    isRefunded: paymentData?.is_refunded || false,
    rateLimitLevel,
    currentInterval,
    checksCount,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    checkNow,
  }
}
