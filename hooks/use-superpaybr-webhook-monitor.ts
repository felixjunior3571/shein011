"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string | null
}

interface WebhookMonitorOptions {
  externalId: string | null
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackExecutedRef = useRef<boolean>(false)

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || callbackExecutedRef.current) return

    try {
      setError(null)
      setLastCheck(new Date())

      if (enableDebug) {
        console.log("🔍 Verificando status SuperPayBR:", externalId)
      }

      // ⚠️ IMPORTANTE: Usar apenas 1 requisição por vez para evitar ERR_INSUFFICIENT_RESOURCES
      const response = await fetch(`/api/superpaybr/check-payment?external_id=${externalId}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        const paymentStatus: PaymentStatus = {
          isPaid: data.isPaid || false,
          isDenied: data.isDenied || false,
          isRefunded: data.isRefunded || false,
          isExpired: data.isExpired || false,
          isCanceled: data.isCanceled || false,
          statusCode: data.statusCode || 1,
          statusName: data.statusName || "pending",
          amount: data.amount || 0,
          paymentDate: data.paymentDate || null,
        }

        setStatus(paymentStatus)

        // Executar callbacks apenas uma vez
        if (!callbackExecutedRef.current) {
          if (paymentStatus.isPaid && onPaymentConfirmed) {
            if (enableDebug) {
              console.log("✅ SuperPayBR: Pagamento confirmado!")
            }
            callbackExecutedRef.current = true
            onPaymentConfirmed(paymentStatus)
          } else if (paymentStatus.isDenied && onPaymentDenied) {
            if (enableDebug) {
              console.log("❌ SuperPayBR: Pagamento negado!")
            }
            callbackExecutedRef.current = true
            onPaymentDenied(paymentStatus)
          } else if (paymentStatus.isExpired && onPaymentExpired) {
            if (enableDebug) {
              console.log("⏰ SuperPayBR: Pagamento vencido!")
            }
            callbackExecutedRef.current = true
            onPaymentExpired(paymentStatus)
          } else if (paymentStatus.isCanceled && onPaymentCanceled) {
            if (enableDebug) {
              console.log("🚫 SuperPayBR: Pagamento cancelado!")
            }
            callbackExecutedRef.current = true
            onPaymentCanceled(paymentStatus)
          } else if (paymentStatus.isRefunded && onPaymentRefunded) {
            if (enableDebug) {
              console.log("↩️ SuperPayBR: Pagamento estornado!")
            }
            callbackExecutedRef.current = true
            onPaymentRefunded(paymentStatus)
          }
        }

        // Parar monitoramento se status final foi atingido
        if (
          paymentStatus.isPaid ||
          paymentStatus.isDenied ||
          paymentStatus.isExpired ||
          paymentStatus.isCanceled ||
          paymentStatus.isRefunded
        ) {
          setIsWaitingForWebhook(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else {
          setIsWaitingForWebhook(true)
        }
      } else {
        throw new Error(data.error || "Erro ao verificar status SuperPayBR")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido SuperPayBR"
      setError(errorMessage)
      if (enableDebug) {
        console.error("❌ Erro ao verificar SuperPayBR:", errorMessage)
      }
    }
  }, [
    externalId,
    enableDebug,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Iniciar monitoramento quando externalId estiver disponível
  useEffect(() => {
    if (!externalId) return

    if (enableDebug) {
      console.log("🚀 Iniciando monitoramento SuperPayBR:", externalId)
    }

    setIsWaitingForWebhook(true)
    callbackExecutedRef.current = false

    // Verificação inicial
    checkPaymentStatus()

    // ⚠️ IMPORTANTE: Intervalo maior para evitar ERR_INSUFFICIENT_RESOURCES
    intervalRef.current = setInterval(checkPaymentStatus, 10000) // 10 segundos

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (enableDebug) {
        console.log("🛑 Monitoramento SuperPayBR parado")
      }
    }
  }, [externalId, checkPaymentStatus, enableDebug])

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
