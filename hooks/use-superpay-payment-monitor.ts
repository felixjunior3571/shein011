"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface PaymentStatus {
  external_id: string
  invoice_id?: string
  status_code: number
  status_title: string
  status_name: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  amount?: number
  payment_date?: string
  last_check: string
}

interface UseSuperpayPaymentMonitorOptions {
  externalId: string | null
  onPaymentConfirmed?: (status: PaymentStatus) => void
  onPaymentDenied?: (status: PaymentStatus) => void
  onPaymentExpired?: (status: PaymentStatus) => void
  onPaymentCanceled?: (status: PaymentStatus) => void
  onPaymentRefunded?: (status: PaymentStatus) => void
  onStatusChange?: (status: PaymentStatus) => void
  enableDebug?: boolean
}

// Intervalos progressivos para EVITAR RATE LIMIT da SuperPay
const RATE_LIMIT_INTERVALS = [
  5000, // 5 segundos (primeiras verificações)
  10000, // 10 segundos
  30000, // 30 segundos
  60000, // 1 minuto
  120000, // 2 minutos
  300000, // 5 minutos
  600000, // 10 minutos (máximo)
]

const MAX_CHECKS = 120 // Máximo 2 horas de monitoramento
const MAX_MONITORING_TIME = 2 * 60 * 60 * 1000 // 2 horas

export function useSuperpayPaymentMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onStatusChange,
  enableDebug = false,
}: UseSuperpayPaymentMonitorOptions) {
  const [paymentData, setPaymentData] = useState<PaymentStatus | null>(null)
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checksCount, setChecksCount] = useState(0)
  const [rateLimitLevel, setRateLimitLevel] = useState(0)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const lastStatusRef = useRef<PaymentStatus | null>(null)
  const isMonitoringRef = useRef(false)

  const currentInterval = RATE_LIMIT_INTERVALS[Math.min(rateLimitLevel, RATE_LIMIT_INTERVALS.length - 1)]

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
      setError(null)
      log(`🔍 Verificação ${checksCount + 1}/${MAX_CHECKS} - External ID: ${externalId}`)

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${encodeURIComponent(externalId)}`, {
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
        const newPaymentData = result.data as PaymentStatus
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
            log(`🎉 PAGAMENTO CONFIRMADO! Redirecionando para /upp/001`)
            onPaymentConfirmed?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_denied) {
            log(`❌ PAGAMENTO NEGADO!`)
            onPaymentDenied?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_expired) {
            log(`⏰ PAGAMENTO VENCIDO!`)
            onPaymentExpired?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_canceled) {
            log(`🚫 PAGAMENTO CANCELADO!`)
            onPaymentCanceled?.(newPaymentData)
            stopMonitoring()
            return
          } else if (newPaymentData.is_refunded) {
            log(`🔄 PAGAMENTO ESTORNADO!`)
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
        log(`⏳ Aguardando webhook SuperPay... (${checksCount + 1}/${MAX_CHECKS})`)
        setIsWaitingForPayment(true)
        setPaymentData(null)

        // Aumentar nível de rate limit gradualmente
        if (rateLimitLevel < RATE_LIMIT_INTERVALS.length - 1) {
          setRateLimitLevel((prev) => prev + 1)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log(`❌ Erro ao verificar status SuperPay:`, errorMessage)
      setError(errorMessage)
    }
  }, [
    externalId,
    checksCount,
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

    // Verificar limites de tempo e tentativas
    if (checksCount >= MAX_CHECKS) {
      log(`⏰ Máximo de verificações atingido (${MAX_CHECKS})`)
      stopMonitoring()
      return
    }

    if (startTimeRef.current && Date.now() - startTimeRef.current.getTime() > MAX_MONITORING_TIME) {
      log(`⏰ Tempo máximo de monitoramento atingido (2h)`)
      stopMonitoring()
      return
    }

    const interval = currentInterval
    log(`⏱️ Próxima verificação em ${interval / 1000}s (nível ${rateLimitLevel + 1})`)

    intervalRef.current = setTimeout(() => {
      checkPaymentStatus().then(() => {
        if (isMonitoringRef.current) {
          scheduleNextCheck()
        }
      })
    }, interval)
  }, [currentInterval, rateLimitLevel, checksCount, checkPaymentStatus, log])

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
    log(`⚙️ Configuração: ${MAX_CHECKS} verificações máx, 2h tempo máx, rate limit progressivo`)

    isMonitoringRef.current = true
    startTimeRef.current = new Date()
    setIsWaitingForPayment(true)
    setError(null)
    setRateLimitLevel(0)
    setChecksCount(0)
    lastStatusRef.current = null

    // Primeira verificação imediata
    checkPaymentStatus().then(() => {
      if (isMonitoringRef.current) {
        scheduleNextCheck()
      }
    })
  }, [externalId, checkPaymentStatus, scheduleNextCheck, log])

  const stopMonitoring = useCallback(() => {
    log(`🛑 Parando monitoramento SuperPay`)

    isMonitoringRef.current = false
    setIsWaitingForPayment(false)

    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  const checkNow = useCallback(async () => {
    log(`🔄 Verificação manual solicitada`)
    await checkPaymentStatus()
  }, [checkPaymentStatus, log])

  // Auto-start monitoring quando externalId estiver disponível
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

  // Cleanup no unmount
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
    isWaitingForPayment,
    error,
    lastCheck,
    checksCount,
    currentInterval,
    rateLimitLevel,
    isPaid: paymentData?.is_paid || false,
    isDenied: paymentData?.is_denied || false,
    isExpired: paymentData?.is_expired || false,
    isCanceled: paymentData?.is_canceled || false,
    isRefunded: paymentData?.is_refunded || false,
    checkNow,
  }
}
