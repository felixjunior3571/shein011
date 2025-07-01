"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  statusCode: number | null
  statusName: string
  amount: number
  paymentDate: string | null
  lastUpdate: string
  externalId?: string
  invoiceId?: string
  source: string
}

interface WebhookMonitorOptions {
  externalId: string
  checkInterval?: number
  maxRetries?: number
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  onError?: (error: string) => void
  enableDebug?: boolean
}

export function useSuperpayWebhookMonitor(options: WebhookMonitorOptions) {
  const {
    externalId,
    checkInterval = 3000,
    maxRetries = 3,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onError,
    enableDebug = false,
  } = options

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    statusCode: null,
    statusName: "Aguardando",
    amount: 0,
    paymentDate: null,
    lastUpdate: new Date().toISOString(),
    source: "supabase_only",
  })

  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("")

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPay Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId) {
      log("❌ External ID não fornecido")
      return
    }

    try {
      log(`🔍 Verificando status SuperPay: ${externalId}`)

      const response = await fetch(`/api/superpay/payment-status?externalId=${encodeURIComponent(externalId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      log("📥 Resposta da API SuperPay:", result)

      if (result.success && result.data) {
        const newStatus = result.data
        const statusKey = `${newStatus.isPaid}-${newStatus.isDenied}-${newStatus.isExpired}-${newStatus.isCanceled}-${newStatus.isRefunded}`

        // Update state
        setPaymentStatus(newStatus)
        setError(null)
        setRetryCount(0)

        // Check for status changes and trigger callbacks
        if (statusKey !== lastStatusRef.current) {
          log(`🔄 Status SuperPay alterado: ${lastStatusRef.current} → ${statusKey}`)
          lastStatusRef.current = statusKey

          if (newStatus.isPaid && onPaymentConfirmed) {
            log("🎉 Pagamento confirmado via webhook SuperPay!")
            onPaymentConfirmed(newStatus)
          } else if (newStatus.isDenied && onPaymentDenied) {
            log("❌ Pagamento negado via webhook SuperPay!")
            onPaymentDenied(newStatus)
          } else if (newStatus.isExpired && onPaymentExpired) {
            log("⏰ Pagamento vencido via webhook SuperPay!")
            onPaymentExpired(newStatus)
          } else if (newStatus.isCanceled && onPaymentCanceled) {
            log("🚫 Pagamento cancelado via webhook SuperPay!")
            onPaymentCanceled(newStatus)
          } else if (newStatus.isRefunded && onPaymentRefunded) {
            log("🔄 Pagamento estornado via webhook SuperPay!")
            onPaymentRefunded(newStatus)
          }
        }

        // Stop monitoring if payment is in final state
        if (newStatus.isPaid || newStatus.isDenied || newStatus.isExpired || newStatus.isCanceled) {
          log(`🛑 Parando monitoramento SuperPay - Status final: ${newStatus.statusName}`)
          setIsMonitoring(false)
        }
      } else {
        log("⚠️ Pagamento SuperPay não encontrado ou erro na resposta")
        setPaymentStatus((prev) => ({
          ...prev,
          lastUpdate: new Date().toISOString(),
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar status SuperPay:", errorMessage)

      setRetryCount((prev) => prev + 1)

      if (retryCount >= maxRetries) {
        setError(`Erro após ${maxRetries} tentativas: ${errorMessage}`)
        setIsMonitoring(false)
        onError?.(errorMessage)
      } else {
        setError(`Tentativa ${retryCount + 1}/${maxRetries}: ${errorMessage}`)
      }
    }
  }, [
    externalId,
    retryCount,
    maxRetries,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onError,
    log,
  ])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!externalId) {
      log("❌ Não é possível iniciar monitoramento sem External ID")
      return
    }

    if (isMonitoring) {
      log("⚠️ Monitoramento SuperPay já está ativo")
      return
    }

    log(`🚀 Iniciando monitoramento SuperPay: ${externalId} (intervalo: ${checkInterval}ms)`)
    setIsMonitoring(true)
    setError(null)
    setRetryCount(0)

    // Check immediately
    checkPaymentStatus()

    // Set up interval
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)
  }, [externalId, isMonitoring, checkInterval, checkPaymentStatus, log])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento SuperPay")
    setIsMonitoring(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  // Auto-start monitoring when externalId is available
  useEffect(() => {
    if (
      externalId &&
      !isMonitoring &&
      !paymentStatus.isPaid &&
      !paymentStatus.isDenied &&
      !paymentStatus.isExpired &&
      !paymentStatus.isCanceled
    ) {
      startMonitoring()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [
    externalId,
    isMonitoring,
    paymentStatus.isPaid,
    paymentStatus.isDenied,
    paymentStatus.isExpired,
    paymentStatus.isCanceled,
    startMonitoring,
  ])

  // Manual check function
  const checkNow = useCallback(() => {
    log("🔄 Verificação manual SuperPay solicitada")
    checkPaymentStatus()
  }, [checkPaymentStatus, log])

  return {
    paymentStatus,
    isMonitoring,
    error,
    retryCount,
    startMonitoring,
    stopMonitoring,
    checkNow,
    // Computed properties for easier access
    isPaid: paymentStatus.isPaid,
    isDenied: paymentStatus.isDenied,
    isExpired: paymentStatus.isExpired,
    isCanceled: paymentStatus.isCanceled,
    isRefunded: paymentStatus.isRefunded,
    statusName: paymentStatus.statusName,
    lastUpdate: paymentStatus.lastUpdate,
  }
}
