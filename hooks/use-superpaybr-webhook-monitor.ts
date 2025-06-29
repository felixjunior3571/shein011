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
  statusName?: string
  statusTitle?: string
  paymentGateway?: string
  paymentType?: string
  provider?: string
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
  checkInterval = 2000,
}: SuperPayBRWebhookMonitorOptions) {
  const [status, setStatus] = useState<
    "idle" | "monitoring" | "confirmed" | "denied" | "expired" | "canceled" | "refunded"
  >("idle")
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

  // Função para verificar localStorage e Supabase (SEM API CALLS DESNECESSÁRIAS)
  const checkForPaymentUpdate = async () => {
    if (!externalId) return null

    try {
      // Verificar se já foi processado
      if (processedPayments.current.has(externalId)) {
        return null
      }

      // 1. Verificar localStorage primeiro (mais rápido)
      const webhookDataKey = `webhook_payment_${externalId}`
      const webhookData = localStorage.getItem(webhookDataKey)

      if (webhookData) {
        const paymentData = JSON.parse(webhookData)
        log("💾 Dados encontrados no localStorage:", paymentData)

        // Marcar como processado
        processedPayments.current.add(externalId)

        return paymentData
      }

      // 2. Se não encontrou no localStorage, verificar Supabase (fallback)
      log("🔍 Verificando Supabase para:", externalId)

      const supabaseResponse = await fetch(`/api/superpaybr/payment-status?external_id=${externalId}`)

      if (supabaseResponse.ok) {
        const supabaseData = await supabaseResponse.json()

        if (supabaseData.success && supabaseData.data) {
          log("🗄️ Dados encontrados no Supabase:", supabaseData.data)

          // Salvar no localStorage para próximas verificações
          localStorage.setItem(webhookDataKey, JSON.stringify(supabaseData.data))

          // Marcar como processado
          processedPayments.current.add(externalId)

          return supabaseData.data
        }
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar pagamento:", error)
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

    log("🔄 Iniciando monitoramento SuperPayBR para:", externalId)
    setStatus("monitoring")
    setIsWaitingForWebhook(true)

    const checkPaymentStatus = async () => {
      const paymentData = await checkForPaymentUpdate()
      setLastCheck(new Date())

      if (paymentData) {
        log("📋 Dados de pagamento encontrados:", paymentData)

        if (paymentData.isPaid) {
          log("🎉 PAGAMENTO CONFIRMADO SUPERPAYBR!")
          setStatus("confirmed")
          setIsWaitingForWebhook(false)
          onPaymentConfirmed?.(paymentData)
        } else if (paymentData.isDenied) {
          log("❌ PAGAMENTO NEGADO SUPERPAYBR!")
          setStatus("denied")
          setIsWaitingForWebhook(false)
          onPaymentDenied?.(paymentData)
        } else if (paymentData.isExpired) {
          log("⏰ PAGAMENTO VENCIDO SUPERPAYBR!")
          setStatus("expired")
          setIsWaitingForWebhook(false)
          onPaymentExpired?.(paymentData)
        } else if (paymentData.isCanceled) {
          log("🚫 PAGAMENTO CANCELADO SUPERPAYBR!")
          setStatus("canceled")
          setIsWaitingForWebhook(false)
          onPaymentCanceled?.(paymentData)
        } else if (paymentData.isRefunded) {
          log("💰 PAGAMENTO REEMBOLSADO SUPERPAYBR!")
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
  }
}
