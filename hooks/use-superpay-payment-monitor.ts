"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PaymentStatus {
  success: boolean
  found: boolean
  status: "pending" | "paid" | "denied" | "expired" | "canceled" | "refunded"
  shouldRedirect: boolean
  redirectUrl?: string
  data?: {
    external_id: string
    invoice_id?: string
    status_code: number
    status_title?: string
    status_description?: string
    amount: number
    payment_date?: string
    is_paid: boolean
    is_denied: boolean
    is_expired: boolean
    is_canceled: boolean
    is_refunded: boolean
    updated_at: string
  }
}

interface UseSuperpayPaymentMonitorProps {
  externalId?: string
  invoiceId?: string
  enabled?: boolean
  onStatusChange?: (status: PaymentStatus) => void
  onPaymentConfirmed?: (data: PaymentStatus["data"]) => void
}

export function useSuperpayPaymentMonitor({
  externalId,
  invoiceId,
  enabled = true,
  onStatusChange,
  onPaymentConfirmed,
}: UseSuperpayPaymentMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [isActive, setIsActive] = useState(enabled)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("pending")

  // Rate limiting inteligente para evitar bloqueio da SuperPay
  const getCheckInterval = useCallback((count: number): number => {
    if (count < 12) return 5000 // Primeiros 12 checks: 5s (1 minuto)
    if (count < 24) return 10000 // Próximos 12 checks: 10s (2 minutos)
    if (count < 36) return 30000 // Próximos 12 checks: 30s (6 minutos)
    if (count < 48) return 60000 // Próximos 12 checks: 1min (12 minutos)
    if (count < 60) return 120000 // Próximos 12 checks: 2min (24 minutos)
    if (count < 72) return 300000 // Próximos 12 checks: 5min (60 minutos)
    return 600000 // Após 72 checks: 10min
  }, [])

  const checkPaymentStatus = useCallback(async () => {
    if (!enabled || !isActive || (!externalId && !invoiceId)) {
      return
    }

    // Limite máximo de verificações (2 horas de monitoramento)
    if (checkCount >= 120) {
      console.log("🛑 Limite máximo de verificações atingido")
      setIsActive(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (externalId) params.append("externalId", externalId)
      if (invoiceId) params.append("invoiceId", invoiceId)

      console.log(`🔍 Verificando pagamento (${checkCount + 1}/120): ${externalId || invoiceId}`)

      const response = await fetch(`/api/superpaybr/payment-status?${params}`)
      const data: PaymentStatus = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro na consulta")
      }

      setStatus(data)
      setCheckCount((prev) => prev + 1)

      // Verificar mudança de status
      if (data.status !== lastStatusRef.current) {
        console.log(`📊 Status mudou: ${lastStatusRef.current} → ${data.status}`)
        lastStatusRef.current = data.status
        onStatusChange?.(data)
      }

      // Status final - parar monitoramento
      if (data.status !== "pending") {
        console.log(`✅ Status final detectado: ${data.status}`)
        setIsActive(false)

        if (data.status === "paid" && data.data) {
          console.log("🎉 Pagamento confirmado!")
          onPaymentConfirmed?.(data.data)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ Erro ao verificar status:", errorMessage)
      setError(errorMessage)

      // Em caso de erro, reduzir frequência
      setCheckCount((prev) => prev + 5)
    } finally {
      setIsLoading(false)
    }
  }, [externalId, invoiceId, enabled, isActive, checkCount, onStatusChange, onPaymentConfirmed])

  // Iniciar/parar monitoramento
  useEffect(() => {
    if (!enabled || !isActive || (!externalId && !invoiceId)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Primeira verificação imediata
    checkPaymentStatus()

    // Configurar intervalo dinâmico
    const scheduleNext = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      const interval = getCheckInterval(checkCount)
      console.log(`⏰ Próxima verificação em ${interval / 1000}s`)

      intervalRef.current = setTimeout(() => {
        checkPaymentStatus().then(scheduleNext)
      }, interval)
    }

    scheduleNext()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, isActive, externalId, invoiceId, checkCount, checkPaymentStatus, getCheckInterval])

  // Função para parar manualmente
  const stopMonitoring = useCallback(() => {
    setIsActive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Função para reiniciar
  const restartMonitoring = useCallback(() => {
    setCheckCount(0)
    setIsActive(true)
    setError(null)
    lastStatusRef.current = "pending"
  }, [])

  return {
    status,
    isLoading,
    error,
    checkCount,
    isActive,
    stopMonitoring,
    restartMonitoring,
    maxChecks: 120,
  }
}
