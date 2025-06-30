"use client"

import { useState, useEffect, useRef } from "react"

interface WebhookMonitorOptions {
  token?: string
  onPaymentConfirmed?: (data: any) => void
  onPaymentDenied?: (data: any) => void
  onError?: (error: string) => void
  pollingInterval?: number
  enableDebug?: boolean
}

interface PaymentStatus {
  paid: boolean
  status: string
  redirect?: string
  redirect_type?: string
  external_id?: string
  paid_at?: string
  gateway?: string
  pay_id?: string
  error?: string
}

export function useSuperpayWebhookMonitor({
  token,
  onPaymentConfirmed,
  onPaymentDenied,
  onError,
  pollingInterval = 5000,
  enableDebug = false,
}: WebhookMonitorOptions) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<string | null>(null)

  const log = (message: string, data?: any) => {
    if (enableDebug) {
      console.log(`[SuperPay Monitor] ${message}`, data || "")
    }
  }

  const checkPaymentStatus = async () => {
    if (!token) {
      log("❌ Token não fornecido")
      return
    }

    try {
      log("🔍 Verificando status do pagamento...", { token })

      const response = await fetch(`/api/verifica-status-superpay?token=${token}`)
      const data = await response.json()

      log("📊 Resposta recebida:", data)

      if (response.ok) {
        setPaymentStatus(data)
        setError(null)
        lastCheckRef.current = new Date().toISOString()

        // Pagamento confirmado
        if (data.paid) {
          log("🎉 PAGAMENTO CONFIRMADO!", data)
          setIsPolling(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onPaymentConfirmed?.(data)
          return
        }

        // Status de aguardando
        if (data.status === "aguardando") {
          log("⏳ Aguardando pagamento...", data)
          return
        }
      } else {
        // Erros de pagamento (recusado, cancelado, etc)
        if (response.status === 402 || response.status === 410) {
          log("❌ Pagamento negado/cancelado:", data)
          setIsPolling(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onPaymentDenied?.(data)
          return
        }

        // Outros erros
        log("⚠️ Erro na verificação:", data)
        setError(data.error || "Erro na verificação")
        onError?.(data.error || "Erro na verificação")
      }
    } catch (err) {
      log("💥 Erro na requisição:", err)
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  const startPolling = () => {
    if (!token) {
      log("❌ Não é possível iniciar polling sem token")
      return
    }

    if (isPolling) {
      log("⚠️ Polling já está ativo")
      return
    }

    log("🚀 Iniciando polling...", { interval: pollingInterval })
    setIsPolling(true)
    setError(null)

    // Primeira verificação imediata
    checkPaymentStatus()

    // Configurar polling
    intervalRef.current = setInterval(checkPaymentStatus, pollingInterval)
  }

  const stopPolling = () => {
    log("🛑 Parando polling...")
    setIsPolling(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Auto-start polling quando token for fornecido
  useEffect(() => {
    if (token) {
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [token])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    paymentStatus,
    isPolling,
    error,
    lastCheck: lastCheckRef.current,
    startPolling,
    stopPolling,
    checkPaymentStatus,
  }
}
