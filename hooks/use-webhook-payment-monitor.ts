"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  external_id: string
  status: string
  payment_confirmed: boolean
  redirect_url: string | null
  redirect_type: string
  amount: number
  paid_at: string | null
  gateway?: string
  pay_id?: string
  last_update: string
  source: "webhook" | "database" | "expired"
}

interface WebhookMonitorOptions {
  externalId?: string
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onError?: (error: string) => void
  checkInterval?: number
  maxChecks?: number
  enableDebug?: boolean
}

export function useWebhookPaymentMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onError,
  checkInterval = 3000, // 3 segundos
  maxChecks = 100, // máximo 100 verificações (5 minutos)
  enableDebug = false,
}: WebhookMonitorOptions) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("")

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[Webhook Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkWebhookStatus = useCallback(async () => {
    if (!externalId) {
      log("❌ External ID não fornecido")
      return
    }

    try {
      log(`🔍 Verificando webhook status (${checkCount + 1}/${maxChecks}):`, externalId)

      const response = await fetch(`/api/superpaybr/check-webhook-status?external_id=${encodeURIComponent(externalId)}`)
      const result = await response.json()

      log("📊 Resposta recebida:", result)

      if (response.ok && result.success) {
        const data = result.data
        setPaymentStatus(data)
        setError(null)
        setCheckCount((prev) => prev + 1)

        // Verificar mudança de status
        const currentStatusKey = `${data.payment_confirmed}-${data.status}`
        if (currentStatusKey !== lastStatusRef.current) {
          log(`🔄 Status alterado: ${lastStatusRef.current} → ${currentStatusKey}`)
          lastStatusRef.current = currentStatusKey

          // Pagamento confirmado
          if (data.payment_confirmed && data.status === "pago") {
            log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK!", data)
            setIsMonitoring(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            onPaymentConfirmed?.(data)
            return
          }

          // Pagamento negado/cancelado/expirado
          if (data.status === "recusado" || data.status === "cancelado") {
            log("❌ PAGAMENTO NEGADO/CANCELADO!", data)
            setIsMonitoring(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            onPaymentDenied?.(data)
            return
          }

          if (data.status === "vencido") {
            log("⏰ PAGAMENTO VENCIDO!", data)
            setIsMonitoring(false)
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
            }
            onPaymentExpired?.(data)
            return
          }
        }

        // Verificar se atingiu o máximo de verificações
        if (checkCount >= maxChecks) {
          log("⏰ Máximo de verificações atingido")
          setIsMonitoring(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onError?.("Tempo limite de monitoramento atingido")
          return
        }

        // Status de aguardando
        if (data.status === "pendente" || data.status === "aguardando") {
          log("⏳ Aguardando pagamento...", { status: data.status, source: data.source })
        }
      } else {
        log("⚠️ Erro na verificação:", result)
        setError(result.error || "Erro na verificação")
        setCheckCount((prev) => prev + 1)

        if (checkCount >= maxChecks) {
          log("❌ Máximo de verificações atingido após erro")
          setIsMonitoring(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
          }
          onError?.(result.error || "Máximo de verificações atingido")
        }
      }
    } catch (err) {
      log("💥 Erro na requisição:", err)
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      setCheckCount((prev) => prev + 1)

      if (checkCount >= maxChecks) {
        log("❌ Máximo de verificações atingido após erro de rede")
        setIsMonitoring(false)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        onError?.(errorMessage)
      }
    }
  }, [externalId, checkCount, maxChecks, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, onError, log])

  const startMonitoring = useCallback(() => {
    if (!externalId) {
      log("❌ Não é possível iniciar monitoramento sem external ID")
      return
    }

    if (isMonitoring) {
      log("⚠️ Monitoramento já está ativo")
      return
    }

    log("🚀 Iniciando monitoramento webhook...", {
      interval: checkInterval,
      maxChecks,
      externalId,
    })

    setIsMonitoring(true)
    setError(null)
    setCheckCount(0)
    lastStatusRef.current = ""

    // Primeira verificação imediata
    checkWebhookStatus()

    // Configurar polling
    intervalRef.current = setInterval(checkWebhookStatus, checkInterval)
  }, [externalId, isMonitoring, checkInterval, maxChecks, checkWebhookStatus, log])

  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento webhook...")
    setIsMonitoring(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  // Auto-start monitoring quando externalId for fornecido
  useEffect(() => {
    if (externalId && !paymentStatus?.payment_confirmed) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId, paymentStatus?.payment_confirmed, startMonitoring, stopMonitoring])

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
    isMonitoring,
    error,
    checkCount,
    maxChecks,
    startMonitoring,
    stopMonitoring,
    checkWebhookStatus,
    // Computed properties
    isPaid: paymentStatus?.payment_confirmed || false,
    isDenied: paymentStatus?.status === "recusado" || paymentStatus?.status === "cancelado",
    isExpired: paymentStatus?.status === "vencido",
    redirectUrl: paymentStatus?.redirect_url,
    lastUpdate: paymentStatus?.last_update,
  }
}
