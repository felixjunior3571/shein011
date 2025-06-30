"use client"

import { useState, useEffect, useCallback } from "react"

interface PaymentStatus {
  paid: boolean
  status: string
  message: string
  external_id?: string
  expires_at?: string
  updated_at?: string
}

interface UsePaymentStatusReturn {
  paymentStatus: PaymentStatus | null
  loading: boolean
  error: string | null
  checkStatus: () => Promise<void>
}

export function usePaymentStatus(token: string | null): UsePaymentStatusReturn {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/verifica-status?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao verificar status")
      }

      setPaymentStatus(data)

      // Se pagamento foi confirmado, parar polling
      if (data.paid) {
        console.log("🎉 Pagamento confirmado! Redirecionando...")
        window.location.href = "/obrigado"
      }
    } catch (err: any) {
      console.error("❌ Erro ao verificar status:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Polling a cada 5 segundos
  useEffect(() => {
    if (!token) return

    // Verificação inicial
    checkStatus()

    // Polling interval
    const interval = setInterval(checkStatus, 5000)

    return () => clearInterval(interval)
  }, [token, checkStatus])

  return {
    paymentStatus,
    loading,
    error,
    checkStatus,
  }
}
