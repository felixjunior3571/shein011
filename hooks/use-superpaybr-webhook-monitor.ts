"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface SuperPayBRPaymentStatus {
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

interface SuperPayBRWebhookMonitorOptions {
  externalId: string | null
  invoiceId?: string | null
  token?: string | null
  checkInterval?: number
  maxChecks?: number
  onPaymentConfirmed?: (data: SuperPayBRPaymentStatus) => void
  onPaymentDenied?: (data: SuperPayBRPaymentStatus) => void
  onPaymentExpired?: (data: SuperPayBRPaymentStatus) => void
  onPaymentCanceled?: (data: SuperPayBRPaymentStatus) => void
  onPaymentRefunded?: (data: SuperPayBRPaymentStatus) => void
  onError?: (error: string) => void
  enableDebug?: boolean
}

export function useSuperPayBRWebhookMonitor(options: SuperPayBRWebhookMonitorOptions) {
  const {
    externalId,
    invoiceId,
    token,
    checkInterval = 3000, // 3 segundos
    maxChecks = 100, // 5 minutos máximo
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onError,
    enableDebug = false,
  } = options

  const [paymentStatus, setPaymentStatus] = useState<SuperPayBRPaymentStatus>({
    isPaid: false,
    isDenied: false,
    isExpired: false,
    isCanceled: false,
    isRefunded: false,
    statusCode: null,
    statusName: "Aguardando",
    amount: 0,
    paymentDate: null,
    lastUpdate: new Date().toISOString(),
    source: "none",
  })

  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("")

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPayBR Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId && !invoiceId && !token) {
      log("❌ Nenhum identificador fornecido")
      return
    }

    if (checkCount >= maxChecks) {
      log(`🛑 Máximo de verificações atingido: ${maxChecks}`)
      setIsWaitingForWebhook(false)
      setError(`Tempo limite atingido após ${maxChecks} verificações`)
      return
    }

    try {
      setCheckCount((prev) => prev + 1)
      setLastCheck(new Date().toISOString())

      log(`🔍 Verificando status SuperPayBR (${checkCount + 1}/${maxChecks}):`, {
        externalId,
        invoiceId,
        token,
      })

      // Build query parameters
      const params = new URLSearchParams()
      if (externalId) params.append("externalId", externalId)
      if (invoiceId) params.append("invoiceId", invoiceId)
      if (token) params.append("token", token)

      const response = await fetch(`/api/superpaybr/payment-status?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      log("📥 Resposta da API SuperPayBR:", result)

      if (result.success && result.data) {
        const newStatus = result.data
        const statusKey = `${newStatus.isPaid}-${newStatus.isDenied}-${newStatus.isExpired}-${newStatus.isCanceled}-${newStatus.isRefunded}`

        // Update state
        setPaymentStatus(newStatus)
        setError(null)

        // Check for status changes and trigger callbacks
        if (statusKey !== lastStatusRef.current) {
          log(`🔄 Status SuperPayBR alterado: ${lastStatusRef.current} → ${statusKey}`)
          lastStatusRef.current = statusKey

          if (newStatus.isPaid && onPaymentConfirmed) {
            log("🎉 Pagamento confirmado via webhook SuperPayBR!")
            onPaymentConfirmed(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isDenied && onPaymentDenied) {
            log("❌ Pagamento negado via webhook SuperPayBR!")
            onPaymentDenied(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isExpired && onPaymentExpired) {
            log("⏰ Pagamento vencido via webhook SuperPayBR!")
            onPaymentExpired(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isCanceled && onPaymentCanceled) {
            log("🚫 Pagamento cancelado via webhook SuperPayBR!")
            onPaymentCanceled(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isRefunded && onPaymentRefunded) {
            log("🔄 Pagamento estornado via webhook SuperPayBR!")
            onPaymentRefunded(newStatus)
            setIsWaitingForWebhook(false)
          }
        }

        // Stop monitoring if payment is in final state
        if (newStatus.isPaid || newStatus.isDenied || newStatus.isExpired || newStatus.isCanceled) {
          log(`🛑 Parando monitoramento SuperPayBR - Status final: ${newStatus.statusName}`)
          setIsWaitingForWebhook(false)
        }
      } else {
        log("⚠️ Pagamento SuperPayBR não encontrado ou erro na resposta")
        setPaymentStatus((prev) => ({
          ...prev,
          lastUpdate: new Date().toISOString(),
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar status SuperPayBR:", errorMessage)

      setError(errorMessage)
      onError?.(errorMessage)

      // Continue checking unless it's a critical error
      if (errorMessage.includes("404") || errorMessage.includes("401")) {
        setIsWaitingForWebhook(false)
      }
    }
  }, [
    externalId,
    invoiceId,
    token,
    checkCount,
    maxChecks,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onError,
    log,
  ])

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!externalId && !invoiceId && !token) {
      log("❌ Não é possível iniciar monitoramento sem identificador")
      return
    }

    if (isWaitingForWebhook) {
      log("⚠️ Monitoramento SuperPayBR já está ativo")
      return
    }

    log(`🚀 Iniciando monitoramento SuperPayBR (intervalo: ${checkInterval}ms, máx: ${maxChecks})`)
    setIsWaitingForWebhook(true)
    setError(null)
    setCheckCount(0)

    // Check immediately
    checkPaymentStatus()

    // Set up interval
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)
  }, [externalId, invoiceId, token, isWaitingForWebhook, checkInterval, maxChecks, checkPaymentStatus, log])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento SuperPayBR")
    setIsWaitingForWebhook(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  // Auto-start monitoring when identifier is available
  useEffect(() => {
    if (
      (externalId || invoiceId || token) &&
      !isWaitingForWebhook &&
      !paymentStatus.isPaid &&
      !paymentStatus.isDenied &&
      !paymentStatus.isExpired &&
      !paymentStatus.isCanceled
    ) {
      startMonitoring()
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [
    externalId,
    invoiceId,
    token,
    isWaitingForWebhook,
    paymentStatus.isPaid,
    paymentStatus.isDenied,
    paymentStatus.isExpired,
    paymentStatus.isCanceled,
    startMonitoring,
  ])

  // Manual check function
  const checkNow = useCallback(() => {
    log("🔄 Verificação manual SuperPayBR solicitada")
    checkPaymentStatus()
  }, [checkPaymentStatus, log])

  return {
    status: paymentStatus,
    isWaitingForWebhook,
    error,
    checkCount,
    maxChecks,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    checkNow,
    // Computed properties for easier access
    isPaid: paymentStatus.isPaid,
    isDenied: paymentStatus.isDenied,
    isExpired: paymentStatus.isExpired,
    isCanceled: paymentStatus.isCanceled,
    isRefunded: paymentStatus.isRefunded,
    statusName: paymentStatus.statusName,
    lastUpdate: paymentStatus.lastUpdate,
  }
}
