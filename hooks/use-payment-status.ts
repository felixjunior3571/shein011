"use client"

import { useState, useEffect, useCallback } from "react"

interface PaymentStatus {
  paid: boolean
  status: string
  message: string
  external_id?: string
  amount?: number
  expires_at?: string
  updated_at?: string
}

interface UsePaymentStatusOptions {
  token: string
  interval?: number
  maxAttempts?: number
  onPaymentSuccess?: (data: PaymentStatus) => void
  onPaymentError?: (status: string) => void
  onExpired?: () => void
  enabled?: boolean
}

export function usePaymentStatus({
  token,
  interval = 5000, // 5 segundos
  maxAttempts = 180, // 15 minutos
  onPaymentSuccess,
  onPaymentError,
  onExpired,
  enabled = true,
}: UsePaymentStatusOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  const checkStatus = useCallback(async () => {
    if (!token || !enabled) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/verifica-status?token=${token}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      const paymentStatus = result.data
      setStatus(paymentStatus)

      // Verificar se pagamento foi confirmado
      if (paymentStatus.paid) {
        console.log("✅ Pagamento confirmado!")
        onPaymentSuccess?.(paymentStatus)
        return true // Para o polling
      }

      // Verificar se houve erro no pagamento
      if (["recusado", "cancelado", "estornado", "vencido"].includes(paymentStatus.status)) {
        console.log("❌ Erro no pagamento:", paymentStatus.status)
        onPaymentError?.(paymentStatus.status)
        return true // Para o polling
      }

      return false // Continua o polling
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro ao verificar status"
      console.error("❌ Erro ao verificar status:", errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }, [token, enabled, onPaymentSuccess, onPaymentError])

  useEffect(() => {
    if (!enabled || !token) return

    let intervalId: NodeJS.Timeout

    const startPolling = async () => {
      // Primeira verificação imediata
      const shouldStop = await checkStatus()
      if (shouldStop) return

      setAttempts(1)

      // Continuar polling
      intervalId = setInterval(async () => {
        setAttempts((prev) => {
          const newAttempts = prev + 1

          // Verificar se atingiu o máximo de tentativas
          if (newAttempts >= maxAttempts) {
            console.log("⏰ Tempo limite atingido")
            onExpired?.()
            clearInterval(intervalId)
            return newAttempts
          }

          // Fazer nova verificação
          checkStatus().then((shouldStop) => {
            if (shouldStop) {
              clearInterval(intervalId)
            }
          })

          return newAttempts
        })
      }, interval)
    }

    startPolling()

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [token, enabled, interval, maxAttempts, checkStatus, onExpired])

  return {
    status,
    loading,
    error,
    attempts,
    maxAttempts,
    checkStatus,
  }
}
