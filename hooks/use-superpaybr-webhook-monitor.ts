"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  statusCode: number
  statusName: string
  statusTitle: string
}

interface PaymentData {
  externalId: string
  amount: number
  paymentDate?: string
  statusName: string
}

interface SuperPayBRWebhookMonitorOptions {
  externalId: string | null
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: SuperPayBRWebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackExecutedRef = useRef<Set<string>>(new Set())

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPayBR Monitor] ${message}`, data || "")
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
      log("🔍 Verificando status do pagamento SuperPayBR:", externalId)
      setLastCheck(new Date())

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${externalId}`)
      const data = await response.json()

      if (data.success && data.data) {
        const paymentData = data.data
        log("📋 Dados do pagamento recebidos:", paymentData)

        const newStatus: PaymentStatus = {
          isPaid: paymentData.is_paid || false,
          isDenied: paymentData.is_denied || false,
          isExpired: paymentData.is_expired || false,
          isCanceled: paymentData.is_canceled || false,
          isRefunded: paymentData.is_refunded || false,
          statusCode: paymentData.status?.code || 1,
          statusName: paymentData.status?.text || "pending",
          statusTitle: paymentData.status?.title || "Aguardando Pagamento",
        }

        setStatus(newStatus)
        setError(null)

        // Executar callbacks apenas uma vez por status
        const callbackKey = `${externalId}_${newStatus.statusName}`

        if (!callbackExecutedRef.current.has(callbackKey)) {
          const callbackData: PaymentData = {
            externalId,
            amount: paymentData.amount || 0,
            paymentDate: paymentData.payment_date,
            statusName: newStatus.statusName,
          }

          if (newStatus.isPaid && onPaymentConfirmed) {
            log("✅ Pagamento confirmado - executando callback")
            onPaymentConfirmed(callbackData)
            callbackExecutedRef.current.add(callbackKey)
          } else if (newStatus.isDenied && onPaymentDenied) {
            log("❌ Pagamento negado - executando callback")
            onPaymentDenied(callbackData)
            callbackExecutedRef.current.add(callbackKey)
          } else if (newStatus.isExpired && onPaymentExpired) {
            log("⏰ Pagamento expirado - executando callback")
            onPaymentExpired(callbackData)
            callbackExecutedRef.current.add(callbackKey)
          } else if (newStatus.isCanceled && onPaymentCanceled) {
            log("🚫 Pagamento cancelado - executando callback")
            onPaymentCanceled(callbackData)
            callbackExecutedRef.current.add(callbackKey)
          } else if (newStatus.isRefunded && onPaymentRefunded) {
            log("↩️ Pagamento estornado - executando callback")
            onPaymentRefunded(callbackData)
            callbackExecutedRef.current.add(callbackKey)
          }
        }

        // Parar monitoramento em status final
        if (
          newStatus.isPaid ||
          newStatus.isDenied ||
          newStatus.isExpired ||
          newStatus.isCanceled ||
          newStatus.isRefunded
        ) {
          log("🛑 Status final atingido, parando monitoramento")
          setIsWaitingForWebhook(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } else {
        log("⚠️ Resposta inválida da API:", data)
        setError(data.error || "Erro na consulta")
      }
    } catch (err) {
      log("❌ Erro ao verificar status:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    }
  }, [externalId, log, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, onPaymentCanceled, onPaymentRefunded])

  // Iniciar monitoramento quando external_id estiver disponível
  useEffect(() => {
    if (!externalId) {
      log("⚠️ External ID não fornecido, aguardando...")
      return
    }

    log("🚀 Iniciando monitoramento SuperPayBR para:", externalId)
    setIsWaitingForWebhook(true)
    setError(null)

    // Verificação inicial
    checkPaymentStatus()

    // Configurar intervalo de verificação (a cada 3 segundos)
    intervalRef.current = setInterval(checkPaymentStatus, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [externalId, checkPaymentStatus, log])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkPaymentStatus,
  }
}
