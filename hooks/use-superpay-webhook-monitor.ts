"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface PaymentStatus {
  external_id: string
  invoice_id?: string
  status_code: number
  status_title: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  amount?: number
  payment_date?: string
  last_check: string
}

interface UseSuperpayWebhookMonitorOptions {
  externalId: string
  onPaymentConfirmed?: (status: PaymentStatus) => void
  onPaymentDenied?: (status: PaymentStatus) => void
  onPaymentExpired?: (status: PaymentStatus) => void
  onPaymentCanceled?: (status: PaymentStatus) => void
  onPaymentRefunded?: (status: PaymentStatus) => void
  onStatusChange?: (status: PaymentStatus) => void
  enabled?: boolean
  maxChecks?: number
  debug?: boolean
}

// Intervalos progressivos para evitar rate limiting
const INTERVALS = [3000, 5000, 10000, 30000, 60000, 120000, 300000, 600000] // 3s, 5s, 10s, 30s, 1min, 2min, 5min, 10min

export function useSuperpayWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onStatusChange,
  enabled = true,
  maxChecks = 240, // 2 horas no máximo
  debug = false,
}: UseSuperpayWebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [checkCount, setCheckCount] = useState(0)
  const [currentInterval, setCurrentInterval] = useState(INTERVALS[0])
  const [error, setError] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<number | null>(null)

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[SuperPay Monitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  const checkPaymentStatus = useCallback(async () => {
    try {
      log(`Verificação ${checkCount + 1}/${maxChecks} para ${externalId}`)

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${externalId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || "Erro ao consultar status")
      }

      if (result.success && result.data) {
        const newStatus = result.data as PaymentStatus
        setStatus(newStatus)
        setError(null)

        log("Status recebido:", {
          status_code: newStatus.status_code,
          status_title: newStatus.status_title,
          is_paid: newStatus.is_paid,
        })

        // Verificar se o status mudou
        const statusChanged = lastStatusRef.current !== newStatus.status_code
        if (statusChanged) {
          log(`Status mudou de ${lastStatusRef.current} para ${newStatus.status_code}`)
          lastStatusRef.current = newStatus.status_code
          onStatusChange?.(newStatus)
        }

        // Chamar callbacks específicos
        if (newStatus.is_paid && statusChanged) {
          log("🎉 Pagamento confirmado!")
          onPaymentConfirmed?.(newStatus)
          return true // Para o monitoramento
        } else if (newStatus.is_denied && statusChanged) {
          log("❌ Pagamento negado!")
          onPaymentDenied?.(newStatus)
          return true // Para o monitoramento
        } else if (newStatus.is_expired && statusChanged) {
          log("⏰ Pagamento vencido!")
          onPaymentExpired?.(newStatus)
          return true // Para o monitoramento
        } else if (newStatus.is_canceled && statusChanged) {
          log("🚫 Pagamento cancelado!")
          onPaymentCanceled?.(newStatus)
          return true // Para o monitoramento
        } else if (newStatus.is_refunded && statusChanged) {
          log("🔄 Pagamento estornado!")
          onPaymentRefunded?.(newStatus)
          return true // Para o monitoramento
        }
      }

      return false // Continua monitoramento
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro na verificação:", errorMessage)
      setError(errorMessage)
      return false // Continua monitoramento mesmo com erro
    }
  }, [
    externalId,
    checkCount,
    maxChecks,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onStatusChange,
    log,
  ])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsMonitoring(false)
    log("Monitoramento parado")
  }, [log])

  const startMonitoring = useCallback(() => {
    if (!enabled || !externalId || isMonitoring) {
      return
    }

    log("Iniciando monitoramento SuperPay", { externalId, maxChecks })
    setIsMonitoring(true)
    setCheckCount(0)
    setCurrentInterval(INTERVALS[0])
    setError(null)

    // Primeira verificação imediata
    checkPaymentStatus().then((shouldStop) => {
      if (shouldStop) {
        stopMonitoring()
        return
      }

      // Configurar verificações periódicas
      let currentCheck = 0
      const scheduleNext = () => {
        if (currentCheck >= maxChecks) {
          log("Máximo de verificações atingido")
          stopMonitoring()
          return
        }

        // Calcular intervalo progressivo
        const intervalIndex = Math.min(Math.floor(currentCheck / 5), INTERVALS.length - 1)
        const interval = INTERVALS[intervalIndex]
        setCurrentInterval(interval)

        log(`Próxima verificação em ${interval / 1000}s (nível ${intervalIndex + 1})`)

        intervalRef.current = setTimeout(async () => {
          currentCheck++
          setCheckCount(currentCheck)

          const shouldStop = await checkPaymentStatus()
          if (shouldStop) {
            stopMonitoring()
          } else {
            scheduleNext()
          }
        }, interval)
      }

      scheduleNext()
    })
  }, [enabled, externalId, isMonitoring, maxChecks, checkPaymentStatus, stopMonitoring, log])

  // Auto-start quando habilitado
  useEffect(() => {
    if (enabled && externalId && !isMonitoring) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [enabled, externalId, startMonitoring, stopMonitoring, isMonitoring])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    status,
    isMonitoring,
    checkCount,
    maxChecks,
    currentInterval,
    error,
    startMonitoring,
    stopMonitoring,
    progress: maxChecks > 0 ? (checkCount / maxChecks) * 100 : 0,
  }
}
