"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentData {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string
  lastUpdate: string
  source?: string
}

interface WebhookMonitorOptions {
  externalId: string | null
  enableDebug?: boolean
  checkInterval?: number
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
}

export function usePureWebhookMonitor({
  externalId,
  enableDebug = false,
  checkInterval = 2000,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentData | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [checkCount, setCheckCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string | null>(null)

  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (enableDebug) {
        console.log(`[PureWebhookMonitor] ${message}`, ...args)
      }
    },
    [enableDebug],
  )

  // Função para verificar localStorage
  const checkLocalStorage = useCallback(() => {
    if (!externalId) return null

    try {
      const localStorageKey = `webhook_payment_${externalId}`
      const storedData = localStorage.getItem(localStorageKey)

      if (storedData) {
        const parsedData = JSON.parse(storedData)
        log("✅ Dados encontrados no localStorage:", parsedData)
        return {
          ...parsedData,
          source: "localStorage",
        }
      }

      log("⚠️ Nenhum dado encontrado no localStorage para:", localStorageKey)
      return null
    } catch (error) {
      log("❌ Erro ao verificar localStorage:", error)
      return null
    }
  }, [externalId, log])

  // Função para verificar Supabase via API
  const checkSupabaseAPI = useCallback(async () => {
    if (!externalId) return null

    try {
      log("🔍 Verificando Supabase via API para:", externalId)

      const response = await fetch(`/api/superpaybr/check-payment?externalId=${externalId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        log("📡 Resposta da API Supabase:", data)

        if (data.success && data.data) {
          return {
            isPaid: data.data.is_paid || false,
            isDenied: data.data.is_denied || false,
            isRefunded: data.data.is_refunded || false,
            isExpired: data.data.is_expired || false,
            isCanceled: data.data.is_canceled || false,
            statusCode: data.data.status_code || 1,
            statusName: data.data.status_name || "Aguardando Pagamento",
            amount: data.data.amount || 0,
            paymentDate: data.data.payment_date || new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            source: "supabase_api",
          }
        }
      } else {
        log("⚠️ Erro na API Supabase:", response.status, response.statusText)
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar Supabase API:", error)
      return null
    }
  }, [externalId, log])

  // Função principal de verificação
  const checkPaymentStatus = useCallback(async () => {
    if (!externalId) {
      log("⚠️ External ID não fornecido, pulando verificação")
      return
    }

    setLastCheck(new Date())
    setCheckCount((prev) => prev + 1)
    setIsWaitingForWebhook(true)

    log(`🔄 Verificação #${checkCount + 1} iniciada para:`, externalId)

    try {
      // 1. Primeiro verificar localStorage (mais rápido)
      let paymentData = checkLocalStorage()

      // 2. Se não encontrou no localStorage, verificar Supabase
      if (!paymentData) {
        log("🔍 Dados não encontrados no localStorage, verificando Supabase...")
        paymentData = await checkSupabaseAPI()
      }

      if (paymentData) {
        log("✅ Dados de pagamento encontrados:", paymentData)
        setStatus(paymentData)
        setError(null)

        // Verificar se o status mudou
        const currentStatusKey = `${paymentData.isPaid}-${paymentData.isDenied}-${paymentData.isExpired}-${paymentData.isCanceled}-${paymentData.isRefunded}`

        if (lastStatusRef.current !== currentStatusKey) {
          lastStatusRef.current = currentStatusKey

          // Executar callbacks baseados no status
          if (paymentData.isPaid && onPaymentConfirmed) {
            log("🎉 Pagamento confirmado! Executando callback...")
            onPaymentConfirmed(paymentData)
          } else if (paymentData.isDenied && onPaymentDenied) {
            log("❌ Pagamento negado! Executando callback...")
            onPaymentDenied(paymentData)
          } else if (paymentData.isExpired && onPaymentExpired) {
            log("⏰ Pagamento vencido! Executando callback...")
            onPaymentExpired(paymentData)
          } else if (paymentData.isCanceled && onPaymentCanceled) {
            log("🚫 Pagamento cancelado! Executando callback...")
            onPaymentCanceled(paymentData)
          } else if (paymentData.isRefunded && onPaymentRefunded) {
            log("🔄 Pagamento estornado! Executando callback...")
            onPaymentRefunded(paymentData)
          }
        }
      } else {
        log("⏳ Nenhum dado de pagamento encontrado, continuando monitoramento...")
        setStatus(null)
      }
    } catch (error) {
      log("❌ Erro na verificação de pagamento:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setIsWaitingForWebhook(false)
    }
  }, [
    externalId,
    checkCount,
    log,
    checkLocalStorage,
    checkSupabaseAPI,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Iniciar monitoramento quando externalId estiver disponível
  useEffect(() => {
    if (!externalId) {
      log("⚠️ External ID não disponível, aguardando...")
      return
    }

    log("🚀 Iniciando monitoramento para:", externalId)

    // Verificação inicial imediata
    checkPaymentStatus()

    // Configurar intervalo de verificação
    intervalRef.current = setInterval(() => {
      checkPaymentStatus()
    }, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      log("🛑 Monitoramento parado para:", externalId)
    }
  }, [externalId, checkInterval, checkPaymentStatus, log])

  // Cleanup no unmount
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
    checkCount,
  }
}
