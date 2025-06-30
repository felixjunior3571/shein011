"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentData {
  externalId: string
  invoiceId?: string
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

interface PaymentMonitorOptions {
  externalId: string | null
  invoiceId?: string | null
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
  enableDebug?: boolean
  checkInterval?: number
  maxRetries?: number
}

export function useDefinitivePaymentMonitor({
  externalId,
  invoiceId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enableDebug = false,
  checkInterval = 3000,
  maxRetries = 100,
}: PaymentMonitorOptions) {
  const [status, setStatus] = useState<
    "idle" | "monitoring" | "confirmed" | "denied" | "expired" | "canceled" | "refunded" | "error"
  >("idle")
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [checkCount, setCheckCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedPayments = useRef<Set<string>>(new Set())
  const isProcessing = useRef(false)

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[DefinitivePaymentMonitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  // Função para verificar localStorage local
  const checkLocalStorage = useCallback(() => {
    if (!externalId) return null

    try {
      const webhookDataKey = `webhook_payment_${externalId}`
      const webhookData = localStorage.getItem(webhookDataKey)

      if (webhookData) {
        const paymentData = JSON.parse(webhookData)
        log("💾 Dados encontrados no localStorage local:", paymentData)
        return { ...paymentData, source: "localStorage_local" }
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar localStorage local:", error)
      return null
    }
  }, [externalId, log])

  // Função para verificar via API webhook
  const checkWebhookAPI = useCallback(async () => {
    if (!externalId) return null

    try {
      log("🔍 Verificando webhook via API...")

      const response = await fetch(`/api/superpaybr/get-webhook-data?externalId=${externalId}`)
      const data = await response.json()

      if (data.success && data.data) {
        log("✅ Dados encontrados via webhook API:", data.data)

        // Salvar no localStorage local para cache
        const webhookDataKey = `webhook_payment_${externalId}`
        localStorage.setItem(webhookDataKey, JSON.stringify(data.data))

        return { ...data.data, source: "webhook_api" }
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar webhook API:", error)
      return null
    }
  }, [externalId, log])

  // Função para verificar status via API SuperPayBR
  const checkPaymentStatusAPI = useCallback(async () => {
    if (!externalId && !invoiceId) return null

    try {
      log("🔍 Verificando status via API SuperPayBR...")

      const params = new URLSearchParams()
      if (externalId) params.append("externalId", externalId)
      if (invoiceId) params.append("invoiceId", invoiceId)

      const response = await fetch(`/api/superpaybr/payment-status?${params.toString()}`)
      const data = await response.json()

      if (data.success && data.data) {
        log("✅ Status encontrado via API SuperPayBR:", data.data)

        // Se o pagamento foi confirmado, salvar no localStorage
        if (data.data.isPaid && externalId) {
          const webhookDataKey = `webhook_payment_${externalId}`
          localStorage.setItem(webhookDataKey, JSON.stringify(data.data))
        }

        return { ...data.data, source: "status_api" }
      }

      return null
    } catch (error) {
      log("❌ Erro ao verificar status API:", error)
      return null
    }
  }, [externalId, invoiceId, log])

  // Função principal de verificação
  const checkPaymentStatus = useCallback(async () => {
    if (isProcessing.current) {
      log("⏳ Verificação já em andamento, pulando...")
      return
    }

    isProcessing.current = true
    setLastCheck(new Date())
    setCheckCount((prev) => prev + 1)

    try {
      log(`🔄 Verificação #${checkCount + 1} - Tentativa ${retryCount + 1}/${maxRetries}`)

      // 1. Verificar localStorage local primeiro (mais rápido)
      let paymentData = checkLocalStorage()

      // 2. Se não encontrou, verificar webhook API
      if (!paymentData) {
        paymentData = await checkWebhookAPI()
      }

      // 3. Se ainda não encontrou, verificar status API como fallback
      if (!paymentData) {
        paymentData = await checkPaymentStatusAPI()
      }

      if (paymentData) {
        log("📋 Dados de pagamento encontrados:", paymentData)
        setPaymentData(paymentData)
        setError(null)
        setRetryCount(0)

        // Verificar se já foi processado para evitar callbacks duplicados
        const paymentKey = paymentData.externalId || paymentData.invoiceId || "unknown"
        if (processedPayments.current.has(paymentKey)) {
          log("⚠️ Pagamento já processado, ignorando...")
          return
        }

        processedPayments.current.add(paymentKey)

        // Processar status
        if (paymentData.isPaid) {
          log("🎉 PAGAMENTO CONFIRMADO!")
          setStatus("confirmed")
          setIsMonitoring(false)
          onPaymentConfirmed?.(paymentData)
        } else if (paymentData.isDenied) {
          log("❌ PAGAMENTO NEGADO!")
          setStatus("denied")
          setIsMonitoring(false)
          onPaymentDenied?.(paymentData)
        } else if (paymentData.isExpired) {
          log("⏰ PAGAMENTO VENCIDO!")
          setStatus("expired")
          setIsMonitoring(false)
          onPaymentExpired?.(paymentData)
        } else if (paymentData.isCanceled) {
          log("🚫 PAGAMENTO CANCELADO!")
          setStatus("canceled")
          setIsMonitoring(false)
          onPaymentCanceled?.(paymentData)
        } else if (paymentData.isRefunded) {
          log("💰 PAGAMENTO REEMBOLSADO!")
          setStatus("refunded")
          setIsMonitoring(false)
          onPaymentRefunded?.(paymentData)
        } else {
          log("⏳ Pagamento ainda pendente...")
          setRetryCount((prev) => prev + 1)
        }
      } else {
        log("⏳ Nenhum dado encontrado, continuando monitoramento...")
        setRetryCount((prev) => prev + 1)

        if (retryCount >= maxRetries) {
          log("❌ Máximo de tentativas atingido")
          setError("Tempo limite de verificação atingido")
          setStatus("error")
          setIsMonitoring(false)
        }
      }
    } catch (error) {
      log("❌ Erro na verificação:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
      setRetryCount((prev) => prev + 1)
    } finally {
      isProcessing.current = false
    }
  }, [
    checkCount,
    retryCount,
    maxRetries,
    checkLocalStorage,
    checkWebhookAPI,
    checkPaymentStatusAPI,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    log,
  ])

  // Iniciar monitoramento
  useEffect(() => {
    if (!externalId && !invoiceId) {
      log("🚫 Nenhum ID fornecido para monitoramento")
      return
    }

    if (
      status === "confirmed" ||
      status === "denied" ||
      status === "expired" ||
      status === "canceled" ||
      status === "refunded"
    ) {
      log("🚫 Monitoramento já finalizado:", status)
      return
    }

    log("🚀 Iniciando monitoramento definitivo...")
    log(`- External ID: ${externalId}`)
    log(`- Invoice ID: ${invoiceId}`)
    log(`- Intervalo: ${checkInterval}ms`)
    log(`- Max tentativas: ${maxRetries}`)

    setStatus("monitoring")
    setIsMonitoring(true)
    setError(null)
    setRetryCount(0)
    setCheckCount(0)

    // Verificar imediatamente
    checkPaymentStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        log("🛑 Monitoramento parado")
      }
    }
  }, [externalId, invoiceId, status, checkInterval, maxRetries, checkPaymentStatus, log])

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Função para forçar nova verificação
  const forceCheck = useCallback(() => {
    log("🔄 Verificação forçada solicitada")
    checkPaymentStatus()
  }, [checkPaymentStatus, log])

  // Função para resetar monitoramento
  const resetMonitoring = useCallback(() => {
    log("🔄 Resetando monitoramento")
    setStatus("idle")
    setIsMonitoring(false)
    setError(null)
    setPaymentData(null)
    setRetryCount(0)
    setCheckCount(0)
    processedPayments.current.clear()

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [log])

  return {
    status,
    isMonitoring,
    error,
    lastCheck,
    paymentData,
    retryCount,
    checkCount,
    maxRetries,
    forceCheck,
    resetMonitoring,
  }
}
