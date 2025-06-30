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
  statusCode?: number
  statusName?: string
  source?: string
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

export function useEnhancedWebhookMonitor({
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
      console.log(`[EnhancedWebhookMonitor] ${message}`, data || "")
    }
  }

  // Função para verificar localStorage local
  const checkLocalStorageForPayment = () => {
    if (!externalId) return null

    try {
      // Verificar se já foi processado
      if (processedPayments.current.has(externalId)) {
        return null
      }

      // Verificar localStorage para dados do webhook
      const webhookDataKey = `webhook_payment_${externalId}`
      const webhookData = localStorage.getItem(webhookDataKey)

      if (webhookData) {
        const paymentData = JSON.parse(webhookData)
        log("💾 Dados encontrados no localStorage local:", paymentData)

        // Marcar como processado
        processedPayments.current.add(externalId)

        return { ...paymentData, source: "localStorage_local" }
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar localStorage local:", error)
      return null
    }
  }

  // Função para verificar via API (localStorage simulado no servidor)
  const checkServerWebhookData = async () => {
    if (!externalId) return null

    try {
      log("🔍 Verificando dados do webhook via API...")

      const response = await fetch(`/api/superpaybr/get-webhook-data?externalId=${externalId}`)
      const data = await response.json()

      if (data.success && data.data) {
        log("✅ Dados encontrados via API:", data.data)

        // Salvar no localStorage local para próximas verificações
        const webhookDataKey = `webhook_payment_${externalId}`
        localStorage.setItem(webhookDataKey, JSON.stringify(data.data))

        // Marcar como processado
        processedPayments.current.add(externalId)

        return { ...data.data, source: "api_server" }
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar dados via API:", error)
      return null
    }
  }

  // Monitoramento principal
  useEffect(() => {
    if (
      !externalId ||
      status === "confirmed" ||
      status === "denied" ||
      status === "expired" ||
      status === "canceled" ||
      status === "refunded"
    ) {
      log("🚫 Monitoramento não iniciado:", { externalId, status })
      return
    }

    log("🔄 Iniciando monitoramento híbrido para:", externalId)
    setStatus("monitoring")
    setIsWaitingForWebhook(true)

    const checkPaymentStatus = async () => {
      setLastCheck(new Date())

      // Primeiro verificar localStorage local
      let paymentData = checkLocalStorageForPayment()

      // Se não encontrou, verificar via API
      if (!paymentData) {
        paymentData = await checkServerWebhookData()
      }

      if (paymentData) {
        log("📋 Dados de pagamento encontrados:", paymentData)
        setPaymentData(paymentData)

        if (paymentData.isPaid) {
          log("🎉 PAGAMENTO CONFIRMADO!")
          setStatus("confirmed")
          setIsWaitingForWebhook(false)
          onPaymentConfirmed?.(paymentData)
        } else if (paymentData.isDenied) {
          log("❌ PAGAMENTO NEGADO!")
          setStatus("denied")
          setIsWaitingForWebhook(false)
          onPaymentDenied?.(paymentData)
        } else if (paymentData.isExpired) {
          log("⏰ PAGAMENTO VENCIDO!")
          setStatus("expired")
          setIsWaitingForWebhook(false)
          onPaymentExpired?.(paymentData)
        } else if (paymentData.isCanceled) {
          log("🚫 PAGAMENTO CANCELADO!")
          setStatus("canceled")
          setIsWaitingForWebhook(false)
          onPaymentCanceled?.(paymentData)
        } else if (paymentData.isRefunded) {
          log("💰 PAGAMENTO REEMBOLSADO!")
          setStatus("refunded")
          setIsWaitingForWebhook(false)
          onPaymentRefunded?.(paymentData)
        }
      } else {
        log("⏳ Ainda aguardando webhook para:", externalId)
      }
    }

    // Verificar imediatamente
    checkPaymentStatus()

    // Verificar a cada intervalo definido
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        log("🛑 Parando monitoramento para:", externalId)
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
