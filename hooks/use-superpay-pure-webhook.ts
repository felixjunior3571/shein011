"use client"

import { useState, useEffect, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  statusCode: number | null
  statusName: string
  amount: number
  paymentDate: string | null
  lastUpdate: string
  externalId?: string
  invoiceId?: string
  source: string
}

interface PureWebhookOptions {
  externalId: string
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  onError?: (error: string) => void
  enableDebug?: boolean
}

export function useSuperpayPureWebhook(options: PureWebhookOptions) {
  const {
    externalId,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onError,
    enableDebug = false,
  } = options

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    statusCode: null,
    statusName: "Aguardando Webhook",
    amount: 0,
    paymentDate: null,
    lastUpdate: new Date().toISOString(),
    source: "pure_webhook",
  })

  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPay Pure Webhook] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  // Função para verificar localStorage (onde o webhook salva os dados)
  const checkWebhookData = useCallback(() => {
    if (!externalId) {
      log("❌ External ID não fornecido")
      return
    }

    try {
      // Verificar se há dados do webhook no localStorage
      const webhookKey = `webhook_payment_${externalId}`
      const webhookData = localStorage.getItem(webhookKey)

      if (webhookData) {
        const data = JSON.parse(webhookData)
        log("✅ Dados do webhook encontrados no localStorage:", data)

        const newStatus: PaymentStatus = {
          isPaid: data.isPaid || false,
          isDenied: data.isDenied || false,
          isExpired: data.isExpired || false,
          isCanceled: data.isCanceled || false,
          isRefunded: data.isRefunded || false,
          statusCode: data.statusCode || null,
          statusName: data.statusName || "Desconhecido",
          amount: data.amount || 0,
          paymentDate: data.paymentDate || null,
          lastUpdate: new Date().toISOString(),
          externalId: externalId,
          invoiceId: data.invoiceId || null,
          source: "webhook_localStorage",
        }

        setPaymentStatus(newStatus)
        setError(null)

        // Executar callbacks baseado no status
        if (newStatus.isPaid && onPaymentConfirmed) {
          log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK SUPERPAY!")
          onPaymentConfirmed(newStatus)
        } else if (newStatus.isDenied && onPaymentDenied) {
          log("❌ PAGAMENTO NEGADO VIA WEBHOOK SUPERPAY!")
          onPaymentDenied(newStatus)
        } else if (newStatus.isExpired && onPaymentExpired) {
          log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK SUPERPAY!")
          onPaymentExpired(newStatus)
        } else if (newStatus.isCanceled && onPaymentCanceled) {
          log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK SUPERPAY!")
          onPaymentCanceled(newStatus)
        } else if (newStatus.isRefunded && onPaymentRefunded) {
          log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK SUPERPAY!")
          onPaymentRefunded(newStatus)
        }

        return true // Dados encontrados
      }

      return false // Nenhum dado encontrado
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar dados do webhook:", errorMessage)
      setError(errorMessage)
      onError?.(errorMessage)
      return false
    }
  }, [
    externalId,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onError,
    log,
  ])

  // Listener para mudanças no localStorage (quando webhook salva dados)
  useEffect(() => {
    if (!externalId) return

    log(`🚀 Iniciando monitoramento PURO por webhook SuperPay para: ${externalId}`)
    log("📡 Sistema 100% webhook - SEM POLLING para evitar rate limiting SuperPay")

    setIsWaitingForWebhook(true)
    setError(null)

    // Verificar imediatamente se já há dados
    const hasData = checkWebhookData()
    if (hasData) {
      setIsWaitingForWebhook(false)
      return
    }

    // Listener para mudanças no localStorage
    const handleStorageChange = (event: StorageEvent) => {
      const webhookKey = `webhook_payment_${externalId}`

      if (event.key === webhookKey && event.newValue) {
        log("🔔 Webhook SuperPay detectado via localStorage!")
        const hasNewData = checkWebhookData()
        if (hasNewData) {
          setIsWaitingForWebhook(false)
        }
      }
    }

    // Adicionar listener
    window.addEventListener("storage", handleStorageChange)

    // Verificar periodicamente (apenas localStorage, sem API calls)
    const interval = setInterval(() => {
      log("🔍 Verificando localStorage para dados do webhook...")
      const hasData = checkWebhookData()
      if (hasData) {
        setIsWaitingForWebhook(false)
        clearInterval(interval)
      }
    }, 2000) // A cada 2 segundos, apenas localStorage

    return () => {
      log("🛑 Parando monitoramento SuperPay webhook")
      window.removeEventListener("storage", handleStorageChange)
      clearInterval(interval)
      setIsWaitingForWebhook(false)
    }
  }, [externalId, checkWebhookData, log])

  // Função para verificação manual (apenas localStorage)
  const checkNow = useCallback(() => {
    log("🔄 Verificação manual SuperPay solicitada (localStorage apenas)")
    const hasData = checkWebhookData()
    if (!hasData) {
      log("⏳ Aguardando notificação da adquirente via webhook SuperPay...")
    }
  }, [checkWebhookData, log])

  return {
    paymentStatus,
    isWaitingForWebhook,
    error,
    checkNow,
    // Propriedades computadas para acesso fácil
    isPaid: paymentStatus.isPaid,
    isDenied: paymentStatus.isDenied,
    isExpired: paymentStatus.isExpired,
    isCanceled: paymentStatus.isCanceled,
    isRefunded: paymentStatus.isRefunded,
    statusName: paymentStatus.statusName,
    lastUpdate: paymentStatus.lastUpdate,
  }
}
