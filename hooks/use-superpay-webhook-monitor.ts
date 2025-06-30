"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface SuperPayWebhookData {
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  status_title: string
  amount: number
  payment_date?: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_critical: boolean
  token: string
  expires_at: string
  processed_at: string
  webhook_data?: any
}

interface UseSuperPayWebhookMonitorProps {
  externalId: string | null
  enableRateLimiting?: boolean
  enableDebug?: boolean
  onPaymentConfirmed?: (data: SuperPayWebhookData) => void
  onPaymentDenied?: (data: SuperPayWebhookData) => void
  onPaymentExpired?: (data: SuperPayWebhookData) => void
  onPaymentCanceled?: (data: SuperPayWebhookData) => void
  onStatusChange?: (data: SuperPayWebhookData) => void
}

interface UseSuperPayWebhookMonitorReturn {
  status: SuperPayWebhookData | null
  isLoading: boolean
  error: string | null
  isWaitingForWebhook: boolean
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isCritical: boolean
  rateLimitLevel: number
  currentInterval: number
  checksCount: number
  lastCheck: Date | null
  startMonitoring: () => void
  stopMonitoring: () => void
  checkNow: () => Promise<void>
}

// Intervalos de rate limiting otimizados para checkout
const RATE_LIMIT_INTERVALS = [
  2000, // 2 segundos (inicial - rápido)
  3000, // 3 segundos
  5000, // 5 segundos
  10000, // 10 segundos
  15000, // 15 segundos
  30000, // 30 segundos
  60000, // 1 minuto
  120000, // 2 minutos
  300000, // 5 minutos
]

const MAX_MONITORING_TIME = 30 * 60 * 1000 // 30 minutos para checkout

export function useSuperPayWebhookMonitor({
  externalId,
  enableRateLimiting = true,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onStatusChange,
}: UseSuperPayWebhookMonitorProps): UseSuperPayWebhookMonitorReturn {
  const [status, setStatus] = useState<SuperPayWebhookData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [rateLimitLevel, setRateLimitLevel] = useState(0)
  const [checksCount, setChecksCount] = useState(0)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const lastStatusRef = useRef<SuperPayWebhookData | null>(null)
  const isMonitoringRef = useRef(false)

  const currentInterval = enableRateLimiting
    ? RATE_LIMIT_INTERVALS[Math.min(rateLimitLevel, RATE_LIMIT_INTERVALS.length - 1)]
    : 2000

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPay Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !isMonitoringRef.current) {
      log("❌ External ID não fornecido ou monitoramento parado")
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      log(`🔍 Verificando status SuperPay: ${externalId}`)

      const response = await fetch(`/api/superpaybr/payment-status?externalId=${encodeURIComponent(externalId)}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      log("📥 Resposta da API SuperPay:", data)

      if (!data.success) {
        throw new Error(data.message || "Erro ao consultar status")
      }

      const webhookData = data.webhook as SuperPayWebhookData | null
      const now = new Date()

      setLastCheck(now)
      setChecksCount((prev) => prev + 1)

      if (webhookData) {
        setStatus(webhookData)
        setIsWaitingForWebhook(false)

        // Verificar se o status mudou
        const statusChanged = !lastStatusRef.current || lastStatusRef.current.status_code !== webhookData.status_code

        if (statusChanged) {
          log(
            `🔄 Status SuperPay alterado: ${lastStatusRef.current?.status_title || "N/A"} → ${webhookData.status_title}`,
          )
          lastStatusRef.current = webhookData

          // Chamar callback de mudança de status
          onStatusChange?.(webhookData)

          // Chamar callbacks específicos baseados no status
          if (webhookData.is_paid) {
            log("🎉 Pagamento confirmado via webhook SuperPay!")
            onPaymentConfirmed?.(webhookData)
            stopMonitoring()
            return
          } else if (webhookData.is_denied) {
            log("❌ Pagamento negado via webhook SuperPay!")
            onPaymentDenied?.(webhookData)
            stopMonitoring()
            return
          } else if (webhookData.is_expired) {
            log("⏰ Pagamento vencido via webhook SuperPay!")
            onPaymentExpired?.(webhookData)
            stopMonitoring()
            return
          } else if (webhookData.is_canceled) {
            log("🚫 Pagamento cancelado via webhook SuperPay!")
            onPaymentCanceled?.(webhookData)
            stopMonitoring()
            return
          }
        }

        // Parar monitoramento se status for crítico
        if (webhookData.is_critical) {
          log(`🛑 Status crítico detectado: ${webhookData.status_title}`)
          stopMonitoring()
          return
        }
      } else {
        log("⏳ Aguardando webhook SuperPay...")
        setIsWaitingForWebhook(true)
        setStatus(null)

        // Aumentar intervalo gradualmente se não encontrou webhook
        if (enableRateLimiting && rateLimitLevel < RATE_LIMIT_INTERVALS.length - 1) {
          setRateLimitLevel((prev) => prev + 1)
        }
      }

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar status SuperPay:", errorMessage)
      setError(errorMessage)

      // Não parar monitoramento por erro - continuar tentando
      log("🔄 Continuando monitoramento apesar do erro...")
    } finally {
      setIsLoading(false)
    }
  }, [
    externalId,
    enableRateLimiting,
    rateLimitLevel,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onStatusChange,
    log,
  ])

  const scheduleNextCheck = useCallback(() => {
    if (!isMonitoringRef.current) return

    // Verificar se excedeu tempo máximo de monitoramento
    if (startTimeRef.current && Date.now() - startTimeRef.current.getTime() > MAX_MONITORING_TIME) {
      log("⏰ Tempo máximo de monitoramento SuperPay atingido (30min)")
      stopMonitoring()
      return
    }

    const interval = currentInterval
    log(`⏱️ Próxima verificação SuperPay em ${interval / 1000}s`)

    intervalRef.current = setTimeout(() => {
      checkPaymentStatus().then(() => {
        // Agendar próxima verificação se ainda estiver monitorando
        if (isMonitoringRef.current) {
          scheduleNextCheck()
        }
      })
    }, interval)
  }, [currentInterval, checkPaymentStatus, log])

  const startMonitoring = useCallback(() => {
    if (!externalId) {
      log("❌ Não é possível iniciar monitoramento sem External ID")
      return
    }

    if (isMonitoringRef.current) {
      log("⚠️ Monitoramento já está ativo")
      return
    }

    log(`🚀 Iniciando monitoramento SuperPay: ${externalId}`)

    isMonitoringRef.current = true
    startTimeRef.current = new Date()
    setIsWaitingForWebhook(true)
    setError(null)
    setRateLimitLevel(0)
    setChecksCount(0)
    lastStatusRef.current = null

    // Primeira verificação imediata
    checkPaymentStatus().then(() => {
      // Agendar verificações periódicas
      if (isMonitoringRef.current) {
        scheduleNextCheck()
      }
    })
  }, [externalId, checkPaymentStatus, scheduleNextCheck, log])

  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento SuperPay")

    isMonitoringRef.current = false
    setIsWaitingForWebhook(false)

    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
  }, [log])

  const checkNow = useCallback(async () => {
    log("🔄 Verificação manual SuperPay solicitada")
    await checkPaymentStatus()
  }, [checkPaymentStatus, log])

  // Auto-start monitoring when externalId is available
  useEffect(() => {
    if (externalId && !status?.is_critical) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId]) // Removido startMonitoring e stopMonitoring das dependências para evitar loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      isMonitoringRef.current = false
    }
  }, [])

  return {
    status,
    isLoading,
    error,
    isWaitingForWebhook,
    isPaid: status?.is_paid || false,
    isDenied: status?.is_denied || false,
    isExpired: status?.is_expired || false,
    isCanceled: status?.is_canceled || false,
    isCritical: status?.is_critical || false,
    rateLimitLevel,
    currentInterval,
    checksCount,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    checkNow,
  }
}
