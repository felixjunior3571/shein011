"use client"

import { useEffect, useState, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode?: number
  statusName?: string
  amount?: number
  paymentDate?: string
  lastUpdate: string
}

interface UseSuperpayWebhookMonitorProps {
  externalId: string
  onPaymentConfirmed?: () => void
  onPaymentDenied?: () => void
  onPaymentRefunded?: () => void
  onPaymentExpired?: () => void
  onPaymentCanceled?: () => void
  checkInterval?: number
}

export function useSuperpayWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentRefunded,
  onPaymentExpired,
  onPaymentCanceled,
  checkInterval = 3000,
}: UseSuperpayWebhookMonitorProps) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isPaid: false,
    isDenied: false,
    isRefunded: false,
    isExpired: false,
    isCanceled: false,
    lastUpdate: new Date().toISOString(),
  })
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkWebhookConfirmation = useCallback(async () => {
    if (!externalId) return

    try {
      console.log(`🔍 [useSuperpayWebhookMonitor] Verificando status SuperPay para: ${externalId}`)

      const response = await fetch(`/api/superpay/payment-status?externalId=${externalId}`)
      const result = await response.json()

      console.log("📊 [useSuperpayWebhookMonitor] Resultado da verificação webhook:", result)

      if (result.success && result.found) {
        const { data } = result

        const newStatus: PaymentStatus = {
          isPaid: data.isPaid,
          isDenied: data.isDenied,
          isRefunded: data.isRefunded,
          isExpired: data.isExpired,
          isCanceled: data.isCanceled,
          statusCode: data.statusCode,
          statusName: data.statusName,
          amount: data.amount,
          paymentDate: data.paymentDate,
          lastUpdate: new Date().toISOString(),
        }

        setPaymentStatus(newStatus)
        setError(null)

        // Verificar qualquer status crítico
        if (data.isPaid && !paymentStatus.isPaid) {
          console.log("🎉 [useSuperpayWebhookMonitor] PAGAMENTO CONFIRMADO VIA WEBHOOK!")
          onPaymentConfirmed?.()
        } else if (data.isDenied && !paymentStatus.isDenied) {
          console.log("❌ [useSuperpayWebhookMonitor] PAGAMENTO NEGADO VIA WEBHOOK!")
          onPaymentDenied?.()
        } else if (data.isRefunded && !paymentStatus.isRefunded) {
          console.log("🔄 [useSuperpayWebhookMonitor] PAGAMENTO ESTORNADO VIA WEBHOOK!")
          onPaymentRefunded?.()
        } else if (data.isExpired && !paymentStatus.isExpired) {
          console.log("⏰ [useSuperpayWebhookMonitor] PAGAMENTO VENCIDO VIA WEBHOOK!")
          onPaymentExpired?.()
        } else if (data.isCanceled && !paymentStatus.isCanceled) {
          console.log("🚫 [useSuperpayWebhookMonitor] PAGAMENTO CANCELADO VIA WEBHOOK!")
          onPaymentCanceled?.()
        } else {
          console.log("⏳ [useSuperpayWebhookMonitor] Status ainda pendente...")
        }
      } else {
        console.log("⏳ [useSuperpayWebhookMonitor] Aguardando notificação da adquirente via webhook...")
        setError(null)
      }
    } catch (error) {
      console.error("[useSuperpayWebhookMonitor] Erro ao verificar webhook:", error)
      setError((error as Error).message)
    }
  }, [
    externalId,
    paymentStatus.isPaid,
    paymentStatus.isDenied,
    paymentStatus.isRefunded,
    paymentStatus.isExpired,
    paymentStatus.isCanceled,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentRefunded,
    onPaymentExpired,
    onPaymentCanceled,
  ])

  useEffect(() => {
    if (!externalId || paymentStatus.isPaid) {
      setIsMonitoring(false)
      return
    }

    console.log(`🔔 [useSuperpayWebhookMonitor] Iniciando monitoramento SuperPay para External ID: ${externalId}`)
    console.log(`⏱️ [useSuperpayWebhookMonitor] Intervalo de verificação: ${checkInterval}ms`)

    setIsMonitoring(true)

    // Verificar imediatamente
    checkWebhookConfirmation()

    // Verificar a cada intervalo definido
    const interval = setInterval(checkWebhookConfirmation, checkInterval)

    return () => {
      console.log(`🛑 [useSuperpayWebhookMonitor] Parando monitoramento SuperPay`)
      clearInterval(interval)
      setIsMonitoring(false)
    }
  }, [externalId, paymentStatus.isPaid, checkInterval, checkWebhookConfirmation])

  return {
    paymentStatus,
    isMonitoring,
    error,
    checkNow: checkWebhookConfirmation,
  }
}
