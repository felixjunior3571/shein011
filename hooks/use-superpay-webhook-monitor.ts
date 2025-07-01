"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface PaymentStatus {
  success: boolean
  status: string
  external_id: string
  invoice_id?: string
  status_code: number
  status_title?: string
  amount?: number
  payment_date?: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  is_final: boolean
  processed_at?: string
  qr_code?: string
  pix_code?: string
}

interface UseSuperpayWebhookMonitorProps {
  externalId: string
  onPaid?: (data: PaymentStatus) => void
  onDenied?: (data: PaymentStatus) => void
  onExpired?: (data: PaymentStatus) => void
  onCanceled?: (data: PaymentStatus) => void
  onRefunded?: (data: PaymentStatus) => void
  onError?: (error: string) => void
  maxAttempts?: number
  autoRedirect?: boolean
}

export function useSuperpayWebhookMonitor({
  externalId,
  onPaid,
  onDenied,
  onExpired,
  onCanceled,
  onRefunded,
  onError,
  maxAttempts = 120, // 2 horas máximo
  autoRedirect = true,
}: UseSuperpayWebhookMonitorProps) {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [nextCheckIn, setNextCheckIn] = useState<number>(0)

  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Intervalos progressivos para evitar sobrecarga
  const getInterval = useCallback((attemptCount: number): number => {
    if (attemptCount < 12) return 5000 // Primeiros 12 checks: 5s (1 minuto)
    if (attemptCount < 24) return 10000 // Próximos 12 checks: 10s (2 minutos)
    if (attemptCount < 36) return 30000 // Próximos 12 checks: 30s (6 minutos)
    if (attemptCount < 48) return 60000 // Próximos 12 checks: 1min (12 minutos)
    if (attemptCount < 60) return 120000 // Próximos 12 checks: 2min (24 minutos)
    if (attemptCount < 72) return 300000 // Próximos 12 checks: 5min (60 minutos)
    return 600000 // Restante: 10min
  }, [])

  const checkPaymentStatus = useCallback(async () => {
    try {
      console.log(`🔍 [Monitor] Verificando status (tentativa ${attempts + 1}/${maxAttempts}):`, externalId)

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${encodeURIComponent(externalId)}`)

      if (!response.ok) {
        if (response.status === 429) {
          console.log("⚠️ [Monitor] Rate limit atingido, aguardando...")
          throw new Error("Rate limit exceeded")
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data: PaymentStatus = await response.json()
      console.log("📊 [Monitor] Status recebido:", data)

      setCurrentStatus(data)
      setAttempts((prev) => prev + 1)

      // Verificar se é um status final
      if (data.is_final) {
        console.log("🏁 [Monitor] Status final detectado:", data.status)
        setIsMonitoring(false)

        // Salvar dados no localStorage para a próxima página
        if (data.is_paid) {
          localStorage.setItem(
            "payment_data",
            JSON.stringify({
              external_id: data.external_id,
              amount: data.amount,
              payment_date: data.payment_date,
              status: "paid",
            }),
          )
        }

        // Chamar callbacks específicos
        if (data.is_paid && onPaid) {
          onPaid(data)
          if (autoRedirect) {
            console.log("🔄 [Monitor] Redirecionando para /upp/001...")
            router.push("/upp/001")
          }
        } else if (data.is_denied && onDenied) {
          onDenied(data)
        } else if (data.is_expired && onExpired) {
          onExpired(data)
        } else if (data.is_canceled && onCanceled) {
          onCanceled(data)
        } else if (data.is_refunded && onRefunded) {
          onRefunded(data)
        }

        return
      }

      // Continuar monitoramento se não for status final
      if (attempts + 1 >= maxAttempts) {
        console.log("⏰ [Monitor] Máximo de tentativas atingido")
        setIsMonitoring(false)
        setError("Tempo limite de monitoramento atingido")
        return
      }

      // Agendar próxima verificação
      const interval = getInterval(attempts + 1)
      setNextCheckIn(Date.now() + interval)

      timeoutRef.current = setTimeout(() => {
        checkPaymentStatus()
      }, interval)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ [Monitor] Erro na verificação:", errorMessage)

      setError(errorMessage)

      if (onError) {
        onError(errorMessage)
      }

      // Tentar novamente após um intervalo maior em caso de erro
      if (attempts + 1 < maxAttempts) {
        const interval = Math.min(getInterval(attempts + 1) * 2, 60000) // Máximo 1 minuto
        setNextCheckIn(Date.now() + interval)

        timeoutRef.current = setTimeout(() => {
          checkPaymentStatus()
        }, interval)
      } else {
        setIsMonitoring(false)
      }
    }
  }, [
    externalId,
    attempts,
    maxAttempts,
    onPaid,
    onDenied,
    onExpired,
    onCanceled,
    onRefunded,
    onError,
    getInterval,
    router,
    autoRedirect,
  ])

  const startMonitoring = useCallback(() => {
    if (isMonitoring) return

    console.log("🚀 [Monitor] Iniciando monitoramento para:", externalId)
    setIsMonitoring(true)
    setAttempts(0)
    setError(null)
    setCurrentStatus(null)

    // Primeira verificação imediata
    checkPaymentStatus()
  }, [externalId, isMonitoring, checkPaymentStatus])

  const stopMonitoring = useCallback(() => {
    console.log("⏹️ [Monitor] Parando monitoramento")
    setIsMonitoring(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    isMonitoring,
    currentStatus,
    attempts,
    maxAttempts,
    error,
    nextCheckIn,
    startMonitoring,
    stopMonitoring,
    progress: Math.min((attempts / maxAttempts) * 100, 100),
  }
}
