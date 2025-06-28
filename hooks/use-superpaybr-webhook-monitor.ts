"use client"

import { useState, useEffect, useRef } from "react"

interface PaymentData {
  externalId: string
  amount: number
  status: string
  paymentDate?: string
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  provider: string
  statusCode?: number
  statusName?: string
  statusTitle?: string
}

interface SuperPayBRWebhookMonitorOptions {
  externalId: string | null
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
  enableDebug?: boolean
  checkInterval?: number
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enableDebug = false,
  checkInterval = 2000, // 2 segundos
}: SuperPayBRWebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentData | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedPayments = useRef<Set<string>>(new Set())

  const log = (message: string, data?: any) => {
    if (enableDebug) {
      console.log(`[SuperPayBRWebhookMonitor] ${message}`, data || "")
    }
  }

  // Função PURA - apenas verifica localStorage (ZERO API CALLS!)
  const checkLocalStorageForPayment = () => {
    if (!externalId || typeof window === "undefined") return null

    try {
      // Verificar se já foi processado
      if (processedPayments.current.has(externalId)) {
        return null
      }

      // Verificar localStorage para dados do webhook
      const webhookKey = `webhook_payment_${externalId}`
      const storedData = localStorage.getItem(webhookKey)

      if (storedData) {
        const paymentData = JSON.parse(storedData)
        log("💾 Dados SuperPayBR encontrados no localStorage:", paymentData)

        // Marcar como processado
        processedPayments.current.add(externalId)

        return paymentData
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar localStorage SuperPayBR:", error)
      setError("Erro ao verificar dados de pagamento")
      return null
    }
  }

  // Monitoramento PURO - apenas localStorage
  useEffect(() => {
    if (
      !externalId ||
      status?.isPaid ||
      status?.isDenied ||
      status?.isExpired ||
      status?.isCanceled ||
      status?.isRefunded
    ) {
      log("🚫 Monitoramento SuperPayBR não iniciado:", { externalId, status })
      return
    }

    log("🔄 Iniciando monitoramento SuperPayBR PURO para:", externalId)
    setIsWaitingForWebhook(true)
    setError(null)

    const checkPaymentStatus = () => {
      const paymentData = checkLocalStorageForPayment()
      setLastCheck(new Date())

      if (paymentData) {
        log("📋 Dados de pagamento SuperPayBR encontrados:", paymentData)
        setStatus(paymentData)
        setIsWaitingForWebhook(false)

        if (paymentData.isPaid) {
          log("🎉 PAGAMENTO SUPERPAYBR CONFIRMADO!")
          onPaymentConfirmed?.(paymentData)
        } else if (paymentData.isDenied) {
          log("❌ PAGAMENTO SUPERPAYBR NEGADO!")
          onPaymentDenied?.(paymentData)
        } else if (paymentData.isExpired) {
          log("⏰ PAGAMENTO SUPERPAYBR VENCIDO!")
          onPaymentExpired?.(paymentData)
        } else if (paymentData.isCanceled) {
          log("🚫 PAGAMENTO SUPERPAYBR CANCELADO!")
          onPaymentCanceled?.(paymentData)
        } else if (paymentData.isRefunded) {
          log("💰 PAGAMENTO SUPERPAYBR REEMBOLSADO!")
          onPaymentRefunded?.(paymentData)
        }
      } else {
        log("⏳ Ainda aguardando webhook SuperPayBR para:", externalId)
      }
    }

    // Verificar imediatamente
    checkPaymentStatus()

    // Verificar a cada intervalo definido (APENAS localStorage!)
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        log("🛑 Parando monitoramento SuperPayBR PURO para:", externalId)
      }
    }
  }, [externalId, status, checkInterval])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
  }
}
