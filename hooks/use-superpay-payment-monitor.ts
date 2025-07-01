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

interface UseSuperpayPaymentMonitorProps {
  externalId: string | null
  enableRateLimiting?: boolean
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
  onStatusChange?: (data: PaymentData) => void
}

interface UseSuperpayPaymentMonitorReturn {
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

// Intervalos de rate limiting para evitar bloqueio da SuperPay
// Conforme documentação: 5min, 30min, 1h, 12h, 24h, 48h, depois 24h até 100h
const RATE_LIMIT_INTERVALS = [
  3000, // 3 segundos (inicial)
  5000, // 5 segundos
  10000, // 10 segundos
  30000, // 30 segundos
  60000, // 1 minuto
  120000, // 2 minutos
  300000, // 5 minutos
  600000, // 10 minutos
]

const MAX_MONITORING_TIME = 2 * 60 * 60 * 1000 // 2 horas para checkout

export function useSuperpayPaymentMonitor({
  externalId,
  enableRateLimiting = true,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onStatusChange,
}: UseSuperpayPaymentMonitorProps): UseSuperpayPaymentMonitorReturn {
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
        console.log(`[SuperPay Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !isMonitoringRef.current) {
      log("❌ External ID não fornecido ou monitoramento parado")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      log(`🔍 Verificando status SuperPay: ${externalId}`)

      const response = await fetch(`/api/superpaybr/payment-status?externalId=${encodeURIComponent(externalId)}`, {
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
      log("📥 Resposta da API SuperPay:", result)

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

        // Verificar se o status mudou
        const statusChanged = !lastStatusRef.current || lastStatusRef.current.status_code !== newPaymentData.status_code

        if (statusChanged) {
          log(
            `🔄 Status SuperPay alterado: ${lastStatusRef.current?.status_title || "N/A"} → ${newPaymentData.status_title}`,
          )
          lastStatusRef.current = newPaymentData

          // Chamar callback de mudança de status
          onStatusChange?.(newPaymentData)

          // Chamar callbacks específicos baseados no status
          if (newPaymentData.is_paid) {
            log("🎉 Pagamento confirmado via webhook SuperPay!")
            onPaymentConfirmed?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_denied) {
            log("❌ Pagamento negado via webhook SuperPay!")
            onPaymentDenied?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_expired) {
            log("⏰ Pagamento vencido via webhook SuperPay!")
            onPaymentExpired?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_canceled) {
            log("🚫 Pagamento cancelado via webhook SuperPay!")
            onPaymentCanceled?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_refunded) {
            log("🔄 Pagamento estornado via webhook SuperPay!")
            onPaymentRefunded?.(newPaymentData)
            stopMonitoring()
            return
          }
        }

        // Parar monitoramento se status for final
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
        log("⏳ Aguardando webhook SuperPay...")
        setIsWaitingForPayment(true)
        setPaymentData(null)

        // Aumentar intervalo gradualmente se não encontrou webhook
        if (enableRateLimiting && rateLimitLevel < RATE_LIMIT_INTERVALS.length - 1) {
          setRateLimitLevel((prev) => prev + 1)
        }
      }

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar status SuperPay:", errorMessage)
      setError(errorMessage)

      // Não parar monitoramento por erro - continuar tentando
      log("🔄 Continuando monitoramento apesar do erro...")
    } finally {
      setIsLoading(false)
    }
  }, [
    externalId,
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

    // Verificar se excedeu tempo máximo de monitoramento
    if (startTimeRef.current && Date.now() - startTimeRef.current.getTime() > MAX_MONITORING_TIME) {
      log("⏰ Tempo máximo de monitoramento SuperPay atingido (2h)")
      stopMonitoring()
      return
    }

    const interval = currentInterval
    log(`⏱️ Próxima verificação SuperPay em ${interval / 1000}s`)

    intervalRef.current = setTimeout(() => {
      checkPaymentStatus().then(() => {
        // Agendar próxima verificação se ainda estiver monitorando
        if (isMonitoringRef.current) {
          scheduleNextCheck()
        }
      })
    }, interval)
  }, [currentInterval, checkPaymentStatus, log])

  const startMonitoring = useCallback(() => {
    if (!externalId) {
      log("❌ Não é possível iniciar monitoramento sem External ID")
      return
    }

    if (isMonitoringRef.current) {
      log("⚠️ Monitoramento já está ativo")
      return
    }

    log(`🚀 Iniciando monitoramento SuperPay: ${externalId}`)

    isMonitoringRef.current = true
    startTimeRef.current = new Date()
    setIsWaitingForPayment(true)
    setError(null)
    setRateLimitLevel(0)
    setChecksCount(0)
    lastStatusRef.current = null

    // Primeira verificação imediata
    checkPaymentStatus().then(() => {
      // Agendar verificações periódicas
      if (isMonitoringRef.current) {
        scheduleNextCheck()
      }
    })
  }, [externalId, checkPaymentStatus, scheduleNextCheck, log])

  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento SuperPay")

    isMonitoringRef.current = false
    setIsWaitingForPayment(false)

    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  const checkNow = useCallback(async () => {
    log("🔄 Verificação manual SuperPay solicitada")
    await checkPaymentStatus()
  }, [checkPaymentStatus, log])

  // Auto-start monitoring when externalId is available
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
  }, [externalId]) // Removido outras dependências para evitar loops

  // Cleanup on unmount
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
