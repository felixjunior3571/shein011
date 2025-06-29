"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string | null
  pixCode?: string
  qrCodeUrl?: string
}

interface UseSuperpayWebhookMonitorOptions {
  externalId: string | null
  checkInterval?: number
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  enableDebug?: boolean
}

export function useSuperpayWebhookMonitor({
  externalId,
  checkInterval = 5000, // Aumentado para 5 segundos para evitar rate limiting
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enableDebug = false,
}: UseSuperpayWebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<string>("pending")
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [checkCount, setCheckCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredCallbackRef = useRef<boolean>(false)
  const lastCheckTimeRef = useRef<number>(0)

  // Sistema de verificação baseado em webhook com rate limiting
  const checkWebhookConfirmation = useCallback(async (): Promise<boolean> => {
    if (!externalId || paymentStatus === "confirmed") {
      return false
    }

    // Rate limiting: não fazer mais de 1 request por segundo
    const now = Date.now()
    if (now - lastCheckTimeRef.current < 1000) {
      if (enableDebug) {
        console.log("⏳ Rate limiting: aguardando 1 segundo...")
      }
      return false
    }
    lastCheckTimeRef.current = now

    try {
      if (enableDebug) {
        console.log(`🔍 Verificação ${checkCount + 1} - webhook SuperPayBR para:`, externalId)
      }

      setCheckCount((prev) => prev + 1)

      const response = await fetch(`/api/superpaybr/payment-status?externalId=${externalId}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.log("⚠️ Rate limit atingido, aguardando...")
          setError("Rate limit atingido, aguardando...")
          return false
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setLastCheck(new Date())
      setError(null) // Limpar erro em caso de sucesso

      if (result.success && result.found) {
        const paymentData: PaymentStatus = result.data
        setStatus(paymentData)

        if (enableDebug) {
          console.log("✅ Dados do webhook encontrados:", paymentData)
        }

        // Trigger callbacks apenas uma vez
        if (!hasTriggeredCallbackRef.current) {
          if (paymentData.isPaid) {
            console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
            setPaymentStatus("confirmed")
            onPaymentConfirmed?.(paymentData)
            hasTriggeredCallbackRef.current = true

            // Redirecionar após 2 segundos
            setTimeout(() => {
              window.location.href = "/upp/001"
            }, 2000)

            return true
          } else if (paymentData.isDenied) {
            console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
            setPaymentStatus("denied")
            onPaymentDenied?.(paymentData)
            hasTriggeredCallbackRef.current = true
            return true
          } else if (paymentData.isExpired) {
            console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
            setPaymentStatus("expired")
            onPaymentExpired?.(paymentData)
            hasTriggeredCallbackRef.current = true
            return true
          } else if (paymentData.isCanceled) {
            console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
            setPaymentStatus("canceled")
            onPaymentCanceled?.(paymentData)
            hasTriggeredCallbackRef.current = true
            return true
          } else if (paymentData.isRefunded) {
            console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
            setPaymentStatus("refunded")
            onPaymentRefunded?.(paymentData)
            hasTriggeredCallbackRef.current = true
            return true
          }
        }

        return false
      } else {
        if (enableDebug) {
          console.log("⏳ Nenhum dado de webhook ainda para:", externalId)
        }
        return false
      }
    } catch (error: any) {
      console.error("❌ Erro ao verificar confirmação webhook:", error)
      setError(error.message || "Unknown error")
      return false
    }
  }, [
    externalId,
    paymentStatus,
    enableDebug,
    checkCount,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Iniciar monitoramento
  const startMonitoring = useCallback(() => {
    if (!externalId || paymentStatus === "confirmed" || isMonitoring) {
      return
    }

    console.log("🚀 Iniciando monitoramento webhook SuperPayBR para:", externalId)
    setIsMonitoring(true)
    setError(null)
    setCheckCount(0)
    hasTriggeredCallbackRef.current = false

    // Verificação imediata
    checkWebhookConfirmation()

    // Verificação periódica com rate limiting
    intervalRef.current = setInterval(() => {
      checkWebhookConfirmation().then((found) => {
        if (found && intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsMonitoring(false)
        }
      })
    }, checkInterval)
  }, [externalId, paymentStatus, isMonitoring, checkWebhookConfirmation, checkInterval])

  // Parar monitoramento
  const stopMonitoring = useCallback(() => {
    if (enableDebug) {
      console.log("🛑 Parando monitoramento webhook SuperPayBR")
    }

    setIsMonitoring(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [enableDebug])

  // Auto-iniciar monitoramento quando externalId estiver disponível
  useEffect(() => {
    if (externalId && paymentStatus === "pending") {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId, paymentStatus, startMonitoring, stopMonitoring])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    status,
    paymentStatus,
    isMonitoring,
    error,
    lastCheck,
    checkCount,
    checkNow: checkWebhookConfirmation,
    startMonitoring,
    stopMonitoring,
  }
}
