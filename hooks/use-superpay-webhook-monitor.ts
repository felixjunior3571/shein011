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
  source: string
  error?: string
}

interface SuperPayWebhookMonitorOptions {
  externalId: string | null
  invoiceId?: string | null
  token?: string | null
  checkInterval?: number
  maxChecks?: number
  onPaymentConfirmed?: (data: SuperPayPaymentStatus) => void
  onPaymentDenied?: (data: SuperPayPaymentStatus) => void
  onPaymentExpired?: (data: SuperPayPaymentStatus) => void
  onPaymentCanceled?: (data: SuperPayPaymentStatus) => void
  onPaymentRefunded?: (data: SuperPayPaymentStatus) => void
  onTokenExpired?: (data: SuperPayPaymentStatus) => void
  onError?: (error: string) => void
  enableDebug?: boolean
}

export function useSuperPayWebhookMonitor(options: SuperPayWebhookMonitorOptions) {
  const {
    externalId,
    invoiceId,
    token,
    checkInterval = 3000, // 3 segundos
    maxChecks = 300, // 15 minutos máximo (300 * 3s = 900s = 15min)
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onTokenExpired,
    onError,
    enableDebug = false,
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

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId && !invoiceId && !token) {
      log("❌ Nenhum identificador fornecido")
      return
    }

    if (checkCount >= maxChecks) {
      log(`🛑 Máximo de verificações atingido: ${maxChecks}`)
      setIsWaitingForWebhook(false)
      setError(`Tempo limite atingido após ${maxChecks} verificações (15 minutos)`)
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

      log(`🔍 Verificando status SuperPay (${checkCount + 1}/${maxChecks}):`, {
        externalId,
        invoiceId,
        token,
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
        }
      } else {
        log("⚠️ Pagamento SuperPay não encontrado ou erro na resposta")
        setPaymentStatus((prev) => ({
          ...prev,
          lastUpdate: new Date().toISOString(),
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar status SuperPay:", errorMessage)

      setError(errorMessage)
      onError?.(errorMessage)

      // Continuar verificando a menos que seja um erro crítico
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
    tokenExpired,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onTokenExpired,
    onError,
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

    log(`🚀 Iniciando monitoramento SuperPay (intervalo: ${checkInterval}ms, máx: ${maxChecks})`)
    setIsWaitingForWebhook(true)
    setError(null)
    setCheckCount(0)

    // Verificar imediatamente
    checkPaymentStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)
  }, [
    externalId,
    invoiceId,
    token,
    isWaitingForWebhook,
    tokenExpired,
    checkInterval,
    maxChecks,
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
    maxChecks,
    lastCheck,
    tokenExpired,
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
  }
}
