"use client"

import { useState, useEffect, useRef } from "react"

interface PaymentData {
  externalId: string
  invoiceId: string
  amount: number
  status: string
  statusCode: number
  statusName: string
  statusDescription: string
  paymentDate?: string
  paymentGateway?: string
  paymentType?: string
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  token?: string
  provider: string
  processedAt: string
}

interface WebhookMonitorOptions {
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
  checkInterval = 2000,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<
    "idle" | "monitoring" | "confirmed" | "denied" | "expired" | "canceled" | "refunded"
  >("idle")
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedPayments = useRef<Set<string>>(new Set())

  const log = (message: string, data?: any) => {
    if (enableDebug) {
      console.log(`[SuperPayBR-WebhookMonitor] ${message}`, data || "")
    }
  }

  // Função para verificar localStorage (IDÊNTICA AO SISTEMA TRYPLOPAY)
  const checkLocalStorageForPayment = () => {
    if (!externalId) return null

    try {
      // Verificar se já foi processado
      if (processedPayments.current.has(externalId)) {
        return null
      }

      // Verificar localStorage para dados do webhook SuperPayBR
      const webhookDataKey = `webhook_payment_${externalId}`
      const webhookData = localStorage.getItem(webhookDataKey)

      if (webhookData) {
        const paymentData = JSON.parse(webhookData)
        log("💾 Dados SuperPayBR encontrados no localStorage:", paymentData)

        // Marcar como processado
        processedPayments.current.add(externalId)

        return paymentData
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar localStorage SuperPayBR:", error)
      return null
    }
  }

  // Função para verificar via API (FALLBACK)
  const checkPaymentViaAPI = async () => {
    if (!externalId) return null

    try {
      log("🔍 Consultando API SuperPayBR para:", externalId)

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${externalId}`)
      const result = await response.json()

      if (result.success && result.data) {
        log("✅ Status SuperPayBR obtido via API:", result.data)
        return result.data
      }

      return null
    } catch (error) {
      log("❌ Erro ao consultar API SuperPayBR:", error)
      return null
    }
  }

  // Monitoramento principal (IDÊNTICO AO SISTEMA TRYPLOPAY)
  useEffect(() => {
    if (
      !externalId ||
      status === "confirmed" ||
      status === "denied" ||
      status === "expired" ||
      status === "canceled" ||
      status === "refunded"
    ) {
      log("🚫 Monitoramento SuperPayBR não iniciado:", { externalId, status })
      return
    }

    log("🔄 Iniciando monitoramento SuperPayBR para:", externalId)
    setStatus("monitoring")
    setIsWaitingForWebhook(true)

    const checkPaymentStatus = async () => {
      // 1. Verificar localStorage primeiro (mais rápido)
      let paymentData = checkLocalStorageForPayment()

      // 2. Se não encontrou no localStorage, verificar via API (fallback)
      if (!paymentData) {
        paymentData = await checkPaymentViaAPI()
      }

      setLastCheck(new Date())

      if (paymentData) {
        log("📋 Dados de pagamento SuperPayBR encontrados:", paymentData)
        setPaymentData(paymentData)

        if (paymentData.isPaid) {
          log("🎉 PAGAMENTO SUPERPAYBR CONFIRMADO!")
          setStatus("confirmed")
          setIsWaitingForWebhook(false)
          onPaymentConfirmed?.(paymentData)
        } else if (paymentData.isDenied) {
          log("❌ PAGAMENTO SUPERPAYBR NEGADO!")
          setStatus("denied")
          setIsWaitingForWebhook(false)
          onPaymentDenied?.(paymentData)
        } else if (paymentData.isExpired) {
          log("⏰ PAGAMENTO SUPERPAYBR VENCIDO!")
          setStatus("expired")
          setIsWaitingForWebhook(false)
          onPaymentExpired?.(paymentData)
        } else if (paymentData.isCanceled) {
          log("🚫 PAGAMENTO SUPERPAYBR CANCELADO!")
          setStatus("canceled")
          setIsWaitingForWebhook(false)
          onPaymentCanceled?.(paymentData)
        } else if (paymentData.isRefunded) {
          log("💰 PAGAMENTO SUPERPAYBR REEMBOLSADO!")
          setStatus("refunded")
          setIsWaitingForWebhook(false)
          onPaymentRefunded?.(paymentData)
        }
      } else {
        log("⏳ Ainda aguardando webhook SuperPayBR para:", externalId)
      }
    }

    // Verificar imediatamente
    checkPaymentStatus()

    // Verificar a cada intervalo definido
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        log("🛑 Parando monitoramento SuperPayBR para:", externalId)
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
    paymentData,
  }
}
