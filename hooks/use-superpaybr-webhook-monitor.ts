"use client"

import { useState, useEffect, useCallback } from "react"

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

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId) return

    try {
      setError(null)
      setLastCheck(new Date())

      if (enableDebug) {
        console.log("🔍 Verificando status SuperPayBR:", externalId)
      }

      const response = await fetch(`/api/superpaybr/check-payment?external_id=${externalId}`)
      const data = await response.json()

      if (data.success) {
        const paymentStatus: PaymentStatus = {
          isPaid: data.isPaid,
          isDenied: data.isDenied,
          isRefunded: data.isRefunded,
          isExpired: data.isExpired,
          isCanceled: data.isCanceled,
          statusCode: data.statusCode,
          statusName: data.statusName,
          amount: data.amount,
          paymentDate: data.paymentDate,
        }

        setStatus(paymentStatus)

        // Executar callbacks baseados no status
        if (paymentStatus.isPaid && onPaymentConfirmed) {
          if (enableDebug) {
            console.log("✅ SuperPayBR: Pagamento confirmado!")
          }
          onPaymentConfirmed(paymentStatus)
        } else if (paymentStatus.isDenied && onPaymentDenied) {
          if (enableDebug) {
            console.log("❌ SuperPayBR: Pagamento negado!")
          }
          onPaymentDenied(paymentStatus)
        } else if (paymentStatus.isExpired && onPaymentExpired) {
          if (enableDebug) {
            console.log("⏰ SuperPayBR: Pagamento vencido!")
          }
          onPaymentExpired(paymentStatus)
        } else if (paymentStatus.isCanceled && onPaymentCanceled) {
          if (enableDebug) {
            console.log("🚫 SuperPayBR: Pagamento cancelado!")
          }
          onPaymentCanceled(paymentStatus)
        } else if (paymentStatus.isRefunded && onPaymentRefunded) {
          if (enableDebug) {
            console.log("↩️ SuperPayBR: Pagamento estornado!")
          }
          onPaymentRefunded(paymentStatus)
        }

        setIsWaitingForWebhook(!paymentStatus.isPaid && !paymentStatus.isDenied && !paymentStatus.isExpired)
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

  // Verificar status periodicamente apenas se não foi pago
  useEffect(() => {
    if (!externalId || status?.isPaid) return

    // Verificação inicial
    checkPaymentStatus()

    // Verificar a cada 5 segundos se ainda não foi pago
    const interval = setInterval(() => {
      if (!status?.isPaid) {
        checkPaymentStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [externalId, status?.isPaid, checkPaymentStatus])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkPaymentStatus,
  }
}
