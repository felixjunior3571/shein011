"use client"

import { useEffect, useRef, useState } from "react"

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
  const callbacksExecutedRef = useRef<Set<string>>(new Set())

  const checkPaymentStatus = async () => {
    if (!externalId) return

    try {
      setError(null)
      setLastCheck(new Date())

      if (enableDebug) {
        console.log("🔍 Verificando status SuperPayBR:", externalId)
      }

      // Consultar apenas memória (sem rate limit)
      const response = await fetch(`/api/superpaybr/payment-status?external_id=${externalId}`)

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao verificar status")
      }

      const paymentStatus: PaymentStatus = {
        isPaid: data.isPaid || false,
        isDenied: data.isDenied || false,
        isRefunded: data.isRefunded || false,
        isExpired: data.isExpired || false,
        isCanceled: data.isCanceled || false,
        statusCode: data.statusCode || 1,
        statusName: data.statusName || "Aguardando Pagamento",
        amount: data.amount || 0,
        paymentDate: data.paymentDate || null,
      }

      setStatus(paymentStatus)

      // Executar callbacks apenas uma vez por status
      const statusKey = `${externalId}_${paymentStatus.statusCode}`

      if (!callbacksExecutedRef.current.has(statusKey)) {
        if (enableDebug) {
          console.log(`📊 Status SuperPayBR atualizado: ${paymentStatus.statusName}`)
        }

        if (paymentStatus.isPaid && onPaymentConfirmed) {
          onPaymentConfirmed(paymentStatus)
          callbacksExecutedRef.current.add(statusKey)
          if (enableDebug) console.log("✅ Callback de pagamento confirmado executado")
        } else if (paymentStatus.isDenied && onPaymentDenied) {
          onPaymentDenied(paymentStatus)
          callbacksExecutedRef.current.add(statusKey)
          if (enableDebug) console.log("❌ Callback de pagamento negado executado")
        } else if (paymentStatus.isExpired && onPaymentExpired) {
          onPaymentExpired(paymentStatus)
          callbacksExecutedRef.current.add(statusKey)
          if (enableDebug) console.log("⏰ Callback de pagamento vencido executado")
        } else if (paymentStatus.isCanceled && onPaymentCanceled) {
          onPaymentCanceled(paymentStatus)
          callbacksExecutedRef.current.add(statusKey)
          if (enableDebug) console.log("🚫 Callback de pagamento cancelado executado")
        } else if (paymentStatus.isRefunded && onPaymentRefunded) {
          onPaymentRefunded(paymentStatus)
          callbacksExecutedRef.current.add(statusKey)
          if (enableDebug) console.log("↩️ Callback de pagamento estornado executado")
        }

        // Parar monitoramento se status final
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
          if (enableDebug) console.log("🛑 Monitoramento SuperPayBR finalizado")
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setError(errorMessage)
      if (enableDebug) console.error("❌ Erro ao verificar status SuperPayBR:", errorMessage)
    }
  }

  // Iniciar monitoramento quando externalId estiver disponível
  useEffect(() => {
    if (!externalId) return

    if (enableDebug) {
      console.log("🚀 Iniciando monitoramento SuperPayBR para:", externalId)
    }

    setIsWaitingForWebhook(true)
    callbacksExecutedRef.current.clear()

    // Verificação inicial
    checkPaymentStatus()

    // Verificar a cada 3 segundos
    intervalRef.current = setInterval(checkPaymentStatus, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsWaitingForWebhook(false)
      if (enableDebug) console.log("🛑 Limpeza do monitoramento SuperPayBR")
    }
  }, [externalId, enableDebug])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkPaymentStatus,
  }
}
