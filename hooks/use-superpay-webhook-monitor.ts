"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface SuperPayPaymentStatus {
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
  token?: string
  expiresAt?: string
  isCritical?: boolean
  source: string
  error?: string
}

interface SuperPayWebhookMonitorOptions {
  externalId: string | null
  invoiceId?: string | null
  token?: string | null
  checkInterval?: number
  maxChecks?: number
  enableRateLimiting?: boolean
  onPaymentConfirmed?: (data: SuperPayPaymentStatus) => void
  onPaymentDenied?: (data: SuperPayPaymentStatus) => void
  onPaymentExpired?: (data: SuperPayPaymentStatus) => void
  onPaymentCanceled?: (data: SuperPayPaymentStatus) => void
  onPaymentRefunded?: (data: SuperPayPaymentStatus) => void
  onTokenExpired?: (data: SuperPayPaymentStatus) => void
  onError?: (error: string) => void
  enableDebug?: boolean
}

// Rate limiting intervals baseado na documentação SuperPay
const RATE_LIMIT_INTERVALS = [
  5 * 60 * 1000, // 5 minutos
  30 * 60 * 1000, // 30 minutos
  60 * 60 * 1000, // 1 hora
  12 * 60 * 60 * 1000, // 12 horas
  24 * 60 * 60 * 1000, // 24 horas
  48 * 60 * 60 * 1000, // 48 horas
  24 * 60 * 60 * 1000, // 24 horas (repetir até 100 horas)
]

const MAX_MONITORING_HOURS = 100

export function useSuperPayWebhookMonitor(options: SuperPayWebhookMonitorOptions) {
  const {
    externalId,
    invoiceId,
    token,
    checkInterval = 3000, // 3 segundos inicialmente
    maxChecks = 20, // Máximo de verificações rápidas antes de aplicar rate limiting
    enableRateLimiting = true,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onTokenExpired,
    onError,
    enableDebug = true,
  } = options

  const [paymentStatus, setPaymentStatus] = useState<SuperPayPaymentStatus>({
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
  const [tokenExpired, setTokenExpired] = useState(false)
  const [currentInterval, setCurrentInterval] = useState(checkInterval)
  const [rateLimitLevel, setRateLimitLevel] = useState(0)
  const [monitoringStartTime, setMonitoringStartTime] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("")

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPay Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  // Verificar se excedeu o tempo máximo de monitoramento
  const isMonitoringExpired = useCallback(() => {
    if (!monitoringStartTime) return false
    const now = new Date()
    const hoursElapsed = (now.getTime() - monitoringStartTime.getTime()) / (1000 * 60 * 60)
    return hoursElapsed >= MAX_MONITORING_HOURS
  }, [monitoringStartTime])

  // Aplicar rate limiting baseado na documentação SuperPay
  const applyRateLimit = useCallback(() => {
    if (!enableRateLimiting) return

    if (checkCount >= maxChecks && rateLimitLevel < RATE_LIMIT_INTERVALS.length) {
      const newInterval = RATE_LIMIT_INTERVALS[rateLimitLevel]
      setCurrentInterval(newInterval)
      setRateLimitLevel((prev) => Math.min(prev + 1, RATE_LIMIT_INTERVALS.length - 1))

      log(`⏰ Aplicando rate limiting - Nível ${rateLimitLevel + 1}: ${newInterval / 1000 / 60} minutos`)
    }
  }, [checkCount, maxChecks, rateLimitLevel, enableRateLimiting, log])

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId && !invoiceId && !token) {
      log("❌ Nenhum identificador fornecido")
      return
    }

    if (isMonitoringExpired()) {
      log("🛑 Monitoramento expirado após 100 horas - Sistema será bloqueado")
      setIsWaitingForWebhook(false)
      setError("Monitoramento expirado após 100 horas. Sistema bloqueado conforme rate limits SuperPay.")
      return
    }

    if (tokenExpired) {
      log("⏰ Token expirado, parando monitoramento")
      setIsWaitingForWebhook(false)
      return
    }

    try {
      setCheckCount((prev) => prev + 1)
      setLastCheck(new Date().toISOString())

      log(`🔍 Verificando status SuperPay (${checkCount + 1}) - Intervalo: ${currentInterval / 1000}s:`, {
        externalId,
        invoiceId,
        token,
        rateLimitLevel,
      })

      // Construir parâmetros de consulta
      const params = new URLSearchParams()
      if (externalId) params.append("externalId", externalId)
      if (invoiceId) params.append("invoiceId", invoiceId)
      if (token) params.append("token", token)

      const response = await fetch(`/api/superpay/payment-status?${params.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      log("📥 Resposta da API SuperPay:", result)

      if (result.success && result.data) {
        const newStatus = result.data
        const statusKey = `${newStatus.isPaid}-${newStatus.isDenied}-${newStatus.isExpired}-${newStatus.isCanceled}-${newStatus.isRefunded}`

        // Verificar se token expirou
        if (newStatus.source === "token_expired" || newStatus.error?.includes("expirado")) {
          log("⏰ Token SuperPay expirado!")
          setTokenExpired(true)
          setIsWaitingForWebhook(false)
          onTokenExpired?.(newStatus)
          return
        }

        // Atualizar estado
        setPaymentStatus(newStatus)
        setError(null)

        // Verificar mudanças de status e disparar callbacks
        if (statusKey !== lastStatusRef.current) {
          log(`🔄 Status SuperPay alterado: ${lastStatusRef.current} → ${statusKey}`)
          lastStatusRef.current = statusKey

          if (newStatus.isPaid && onPaymentConfirmed) {
            log("🎉 Pagamento confirmado via webhook SuperPay!")
            onPaymentConfirmed(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isDenied && onPaymentDenied) {
            log("❌ Pagamento negado via webhook SuperPay!")
            onPaymentDenied(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isExpired && onPaymentExpired) {
            log("⏰ Pagamento vencido via webhook SuperPay!")
            onPaymentExpired(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isCanceled && onPaymentCanceled) {
            log("🚫 Pagamento cancelado via webhook SuperPay!")
            onPaymentCanceled(newStatus)
            setIsWaitingForWebhook(false)
          } else if (newStatus.isRefunded && onPaymentRefunded) {
            log("🔄 Pagamento estornado via webhook SuperPay!")
            onPaymentRefunded(newStatus)
            setIsWaitingForWebhook(false)
          }
        }

        // Parar monitoramento se pagamento está em estado final
        if (newStatus.isPaid || newStatus.isDenied || newStatus.isExpired || newStatus.isCanceled) {
          log(`🛑 Parando monitoramento SuperPay - Status final: ${newStatus.statusName}`)
          setIsWaitingForWebhook(false)
        } else {
          // Aplicar rate limiting se necessário
          applyRateLimit()
        }
      } else {
        log("⚠️ Pagamento SuperPay não encontrado ou erro na resposta")
        setPaymentStatus((prev) => ({
          ...prev,
          lastUpdate: new Date().toISOString(),
        }))
        applyRateLimit()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar status SuperPay:", errorMessage)

      setError(errorMessage)
      onError?.(errorMessage)

      // Continuar verificando a menos que seja um erro crítico
      if (errorMessage.includes("404") || errorMessage.includes("401")) {
        setIsWaitingForWebhook(false)
      } else {
        applyRateLimit()
      }
    }
  }, [
    externalId,
    invoiceId,
    token,
    checkCount,
    currentInterval,
    rateLimitLevel,
    tokenExpired,
    isMonitoringExpired,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onTokenExpired,
    onError,
    applyRateLimit,
    log,
  ])

  // Iniciar monitoramento
  const startMonitoring = useCallback(() => {
    if (!externalId && !invoiceId && !token) {
      log("❌ Não é possível iniciar monitoramento sem identificador")
      return
    }

    if (isWaitingForWebhook) {
      log("⚠️ Monitoramento SuperPay já está ativo")
      return
    }

    if (tokenExpired) {
      log("⏰ Token expirado, não é possível iniciar monitoramento")
      return
    }

    log(`🚀 Iniciando monitoramento SuperPay com rate limiting (intervalo inicial: ${currentInterval / 1000}s)`)
    setIsWaitingForWebhook(true)
    setError(null)
    setCheckCount(0)
    setRateLimitLevel(0)
    setCurrentInterval(checkInterval)
    setMonitoringStartTime(new Date())

    // Verificar imediatamente
    checkPaymentStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkPaymentStatus, currentInterval)
  }, [
    externalId,
    invoiceId,
    token,
    isWaitingForWebhook,
    tokenExpired,
    currentInterval,
    checkInterval,
    checkPaymentStatus,
    log,
  ])

  // Parar monitoramento
  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento SuperPay")
    setIsWaitingForWebhook(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  // Atualizar intervalo quando rate limiting muda
  useEffect(() => {
    if (intervalRef.current && isWaitingForWebhook) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(checkPaymentStatus, currentInterval)
    }
  }, [currentInterval, isWaitingForWebhook, checkPaymentStatus])

  // Auto-iniciar monitoramento quando identificador estiver disponível
  useEffect(() => {
    if (
      (externalId || invoiceId || token) &&
      !isWaitingForWebhook &&
      !paymentStatus.isPaid &&
      !paymentStatus.isDenied &&
      !paymentStatus.isExpired &&
      !paymentStatus.isCanceled &&
      !tokenExpired
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
    tokenExpired,
    startMonitoring,
  ])

  // Função de verificação manual
  const checkNow = useCallback(() => {
    log("🔄 Verificação manual SuperPay solicitada")
    checkPaymentStatus()
  }, [checkPaymentStatus, log])

  return {
    status: paymentStatus,
    isWaitingForWebhook,
    error,
    checkCount,
    lastCheck,
    tokenExpired,
    currentInterval,
    rateLimitLevel,
    monitoringStartTime,
    startMonitoring,
    stopMonitoring,
    checkNow,
    // Propriedades computadas para acesso mais fácil
    isPaid: paymentStatus.isPaid,
    isDenied: paymentStatus.isDenied,
    isExpired: paymentStatus.isExpired,
    isCanceled: paymentStatus.isCanceled,
    isRefunded: paymentStatus.isRefunded,
    statusName: paymentStatus.statusName,
    lastUpdate: paymentStatus.lastUpdate,
    token: paymentStatus.token,
    expiresAt: paymentStatus.expiresAt,
    isCritical: paymentStatus.isCritical,
  }
}
