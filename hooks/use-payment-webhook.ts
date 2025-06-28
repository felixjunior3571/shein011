"use client"

import { useState, useEffect, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isRefunded: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string | null
}

interface UsePaymentWebhookOptions {
  externalId: string | null
  checkInterval?: number // em milissegundos, padrão 3000 (3 segundos)
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
}

export function usePaymentWebhook({
  externalId,
  checkInterval = 3000,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: UsePaymentWebhookOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || isChecking) return

    setIsChecking(true)
    setError(null)

    try {
      console.log(`🔍 [usePaymentWebhook] Verificando status para: ${externalId}`)

      const response = await fetch(`/api/tryplopay/payment-status?externalId=${externalId}`)
      const result = await response.json()

      setLastChecked(new Date())

      if (result.success && result.found) {
        const paymentData: PaymentStatus = {
          isPaid: result.data.isPaid,
          isRefunded: result.data.isRefunded,
          isDenied: result.data.isDenied,
          isExpired: result.data.isExpired,
          isCanceled: result.data.isCanceled,
          statusCode: result.data.statusCode,
          statusName: result.data.statusName,
          amount: result.data.amount,
          paymentDate: result.data.paymentDate,
        }

        setStatus(paymentData)

        // Chamar callbacks apropriados
        if (paymentData.isPaid && onPaymentConfirmed) {
          console.log("🎉 [usePaymentWebhook] Pagamento confirmado!")
          onPaymentConfirmed(paymentData)
        } else if (paymentData.isDenied && onPaymentDenied) {
          console.log("❌ [usePaymentWebhook] Pagamento negado!")
          onPaymentDenied(paymentData)
        } else if (paymentData.isExpired && onPaymentExpired) {
          console.log("⏰ [usePaymentWebhook] Pagamento vencido!")
          onPaymentExpired(paymentData)
        } else if (paymentData.isCanceled && onPaymentCanceled) {
          console.log("🚫 [usePaymentWebhook] Pagamento cancelado!")
          onPaymentCanceled(paymentData)
        } else if (paymentData.isRefunded && onPaymentRefunded) {
          console.log("🔄 [usePaymentWebhook] Pagamento estornado!")
          onPaymentRefunded(paymentData)
        }
      } else {
        console.log("⏳ [usePaymentWebhook] Ainda aguardando confirmação...")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ [usePaymentWebhook] Erro na verificação:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsChecking(false)
    }
  }, [
    externalId,
    isChecking,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  useEffect(() => {
    if (!externalId) {
      console.log("⚠️ [usePaymentWebhook] External ID não fornecido")
      return
    }

    console.log(`🚀 [usePaymentWebhook] Iniciando monitoramento para: ${externalId}`)
    console.log(`⏱️ [usePaymentWebhook] Intervalo de verificação: ${checkInterval}ms`)

    // Verificar imediatamente
    checkPaymentStatus()

    // Configurar verificação periódica
    const interval = setInterval(checkPaymentStatus, checkInterval)

    return () => {
      console.log("🛑 [usePaymentWebhook] Parando monitoramento")
      clearInterval(interval)
    }
  }, [externalId, checkInterval, checkPaymentStatus])

  return {
    status,
    isChecking,
    error,
    lastChecked,
    checkNow: checkPaymentStatus,
  }
}
