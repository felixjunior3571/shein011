"use client"

import { useEffect, useState } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string
  lastUpdate: string
  externalId: string
  invoiceId: string
}

interface UseWebhookMonitorOptions {
  externalId: string
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  checkInterval?: number
  maxAttempts?: number
}

export function usePureWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  checkInterval = 3000, // 3 segundos
  maxAttempts = 100, // 5 minutos máximo
}: UseWebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!externalId) return

    let intervalId: NodeJS.Timeout
    let isMounted = true

    const checkPaymentStatus = async () => {
      if (attempts >= maxAttempts) {
        console.log(`⏰ Máximo de tentativas atingido para ${externalId}`)
        setIsLoading(false)
        return
      }

      try {
        console.log(`🔍 Verificando status via webhook: ${externalId} (tentativa ${attempts + 1})`)

        const response = await fetch(`/api/superpaybr/payment-status?externalId=${externalId}`)
        const result = await response.json()

        if (!isMounted) return

        setAttempts((prev) => prev + 1)

        if (result.success && result.data) {
          const paymentData = result.data
          setStatus(paymentData)
          setError(null)

          console.log(`📊 Status obtido: ${paymentData.statusName} (${paymentData.statusCode})`)

          // Verificar status finais
          if (paymentData.isPaid) {
            console.log(`🎉 Pagamento confirmado via webhook: ${externalId}`)
            setIsLoading(false)
            onPaymentConfirmed?.(paymentData)
            return
          }

          if (paymentData.isDenied) {
            console.log(`❌ Pagamento negado: ${externalId}`)
            setIsLoading(false)
            onPaymentDenied?.(paymentData)
            return
          }

          if (paymentData.isExpired) {
            console.log(`⏰ Pagamento expirado: ${externalId}`)
            setIsLoading(false)
            onPaymentExpired?.(paymentData)
            return
          }

          if (paymentData.isCanceled || paymentData.isRefunded) {
            console.log(`🚫 Pagamento cancelado/estornado: ${externalId}`)
            setIsLoading(false)
            return
          }
        } else {
          console.log(`⏳ Aguardando confirmação via webhook: ${externalId}`)
          setError(null)
        }
      } catch (err) {
        console.log(`❌ Erro ao verificar status: ${err}`)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      }
    }

    // Primeira verificação imediata
    checkPaymentStatus()

    // Configurar intervalo de verificação
    intervalId = setInterval(checkPaymentStatus, checkInterval)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [externalId, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, checkInterval, maxAttempts, attempts])

  return {
    status,
    isLoading,
    error,
    attempts,
    maxAttempts,
  }
}
