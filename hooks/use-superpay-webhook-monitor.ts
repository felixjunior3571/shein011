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
    checkInterval = 3000, // 3 segundos (igual TryploPay)
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
    source: "webhook_monitor",
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

  const checkWebhookConfirmation = useCallback(async () => {
    if (!externalId) {
      log("❌ External ID não fornecido")
      return
    }

    try {
      log(`🔍 Verificando confirmação via webhook SuperPay para: ${externalId}`)

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
      log("📊 Resultado da verificação webhook SuperPay:", result)

      if (result.success && result.found) {
        const { data } = result

        const newStatus: PaymentStatus = {
          isPaid: data.isPaid,
          isDenied: data.isDenied,
          isExpired: data.isExpired,
          isCanceled: data.isCanceled,
          isRefunded: data.isRefunded,
          statusCode: data.statusCode,
          statusName: data.statusName,
          amount: data.amount,
          paymentDate: data.paymentDate,
          lastUpdate: new Date().toISOString(),
          externalId: data.externalId,
          invoiceId: data.invoiceId,
          source: "webhook_confirmed",
        }

        const statusKey = `${newStatus.isPaid}-${newStatus.isDenied}-${newStatus.isExpired}-${newStatus.isCanceled}-${newStatus.isRefunded}`

        setPaymentStatus(newStatus)
        setError(null)
        setRetryCount(0)

        // Verificar mudanças de status e executar callbacks
        if (statusKey !== lastStatusRef.current) {
          log(`🔄 Status SuperPay alterado: ${lastStatusRef.current} → ${statusKey}`)
          lastStatusRef.current = statusKey

          if (newStatus.isPaid && onPaymentConfirmed) {
            log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
            onPaymentConfirmed(newStatus)
          } else if (newStatus.isDenied && onPaymentDenied) {
            log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
            onPaymentDenied(newStatus)
          } else if (newStatus.isExpired && onPaymentExpired) {
            log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
            onPaymentExpired(newStatus)
          } else if (newStatus.isCanceled && onPaymentCanceled) {
            log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
            onPaymentCanceled(newStatus)
          } else if (newStatus.isRefunded && onPaymentRefunded) {
            log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
            onPaymentRefunded(newStatus)
          }
        }

        // Parar monitoramento se pagamento está em estado final
        if (newStatus.isPaid || newStatus.isDenied || newStatus.isExpired || newStatus.isCanceled) {
          log(`🛑 Parando monitoramento SuperPay - Status final: ${newStatus.statusName}`)
          setIsMonitoring(false)
        }
      } else {
        log("⏳ Aguardando notificação da adquirente via webhook SuperPay...")
        setPaymentStatus((prev) => ({
          ...prev,
          lastUpdate: new Date().toISOString(),
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar webhook SuperPay:", errorMessage)

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

  // Iniciar monitoramento automaticamente quando externalId estiver disponível
  useEffect(() => {
    if (
      externalId &&
      !isMonitoring &&
      !paymentStatus.isPaid &&
      !paymentStatus.isDenied &&
      !paymentStatus.isExpired &&
      !paymentStatus.isCanceled
    ) {
      log(`🚀 Iniciando monitoramento SuperPay para External ID: ${externalId}`)
      log(`⏱️ Intervalo de verificação: ${checkInterval}ms`)

      setIsMonitoring(true)
      setError(null)
      setRetryCount(0)

      // Verificar imediatamente
      checkWebhookConfirmation()

      // Verificar a cada intervalo definido
      intervalRef.current = setInterval(checkWebhookConfirmation, checkInterval)
    }

    return () => {
      if (intervalRef.current) {
        log(`🛑 Parando monitoramento SuperPay`)
        clearInterval(intervalRef.current)
        setIsMonitoring(false)
      }
    }
  }, [
    externalId,
    isMonitoring,
    paymentStatus.isPaid,
    paymentStatus.isDenied,
    paymentStatus.isExpired,
    paymentStatus.isCanceled,
    checkInterval,
    checkWebhookConfirmation,
    log,
  ])

  // Função para verificação manual
  const checkNow = useCallback(() => {
    log("🔄 Verificação manual SuperPay solicitada")
    checkWebhookConfirmation()
  }, [checkWebhookConfirmation, log])

  return {
    paymentStatus,
    isMonitoring,
    error,
    retryCount,
    checkNow,
    // Propriedades computadas para acesso fácil
    isPaid: paymentStatus.isPaid,
    isDenied: paymentStatus.isDenied,
    isExpired: paymentStatus.isExpired,
    isCanceled: paymentStatus.isCanceled,
    isRefunded: paymentStatus.isRefunded,
    statusName: paymentStatus.statusName,
    lastUpdate: paymentStatus.lastUpdate,
  }
}
