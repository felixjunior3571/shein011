"use client"

import { useState, useEffect, useCallback } from "react"

interface PaymentData {
  externalId: string
  invoiceId: string
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  amount: number
  paymentDate: string
  statusCode: number
  statusName: string
}

interface UseSuperpayWebhookMonitorProps {
  externalId?: string
  invoiceId?: string
  token?: string
  onPaid?: (data: PaymentData) => void
  onDenied?: (data: PaymentData) => void
  onRefunded?: (data: PaymentData) => void
  onExpired?: (data: PaymentData) => void
  onCanceled?: (data: PaymentData) => void
  onStatusChange?: (data: PaymentData) => void
  enabled?: boolean
  interval?: number
}

export function useSuperpayWebhookMonitor({
  externalId,
  invoiceId,
  token,
  onPaid,
  onDenied,
  onRefunded,
  onExpired,
  onCanceled,
  onStatusChange,
  enabled = true,
  interval = 3000, // 3 segundos
}: UseSuperpayWebhookMonitorProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const checkWebhookConfirmation = useCallback(async () => {
    if (!enabled || (!externalId && !invoiceId && !token)) {
      return
    }

    // Evitar múltiplas verificações simultâneas
    if (isLoading) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Construir URL de consulta
      const params = new URLSearchParams()
      if (externalId) params.append("externalId", externalId)
      if (invoiceId) params.append("invoiceId", invoiceId)
      if (token) params.append("token", token)

      console.log("🔍 Verificando webhook SuperPayBR:", { externalId, invoiceId, token })

      const response = await fetch(`/api/superpaybr/payment-status?${params.toString()}`)
      const result = await response.json()

      setCheckCount((prev) => prev + 1)
      setLastCheck(new Date())

      if (!response.ok) {
        throw new Error(result.error || "Erro na verificação")
      }

      if (result.success && result.found) {
        const data = result.data as PaymentData
        setPaymentData(data)

        console.log("✅ Status encontrado:", {
          isPaid: data.isPaid,
          isDenied: data.isDenied,
          isRefunded: data.isRefunded,
          isExpired: data.isExpired,
          isCanceled: data.isCanceled,
        })

        // Chamar callbacks específicos
        if (data.isPaid && onPaid) {
          onPaid(data)
        } else if (data.isDenied && onDenied) {
          onDenied(data)
        } else if (data.isRefunded && onRefunded) {
          onRefunded(data)
        } else if (data.isExpired && onExpired) {
          onExpired(data)
        } else if (data.isCanceled && onCanceled) {
          onCanceled(data)
        }

        // Callback geral de mudança de status
        if (onStatusChange) {
          onStatusChange(data)
        }
      } else {
        console.log("⏳ Aguardando webhook...")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ Erro na verificação webhook:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    externalId,
    invoiceId,
    token,
    enabled,
    isLoading,
    onPaid,
    onDenied,
    onRefunded,
    onExpired,
    onCanceled,
    onStatusChange,
  ])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Verificação inicial
    checkWebhookConfirmation()

    // Configurar intervalo de verificação
    const intervalId = setInterval(checkWebhookConfirmation, interval)

    return () => {
      clearInterval(intervalId)
    }
  }, [checkWebhookConfirmation, enabled, interval])

  return {
    paymentData,
    isLoading,
    error,
    checkCount,
    lastCheck,
    refetch: checkWebhookConfirmation,
  }
}
