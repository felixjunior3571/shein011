"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface SuperPayWebhookData {
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  amount: number
  payment_date?: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  is_critical: boolean
  token: string
  expires_at: string
  processed_at: string
}

interface UseSuperPayWebhookMonitorProps {
  externalId: string
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
  isRefunded: boolean
  isCritical: boolean
  rateLimitLevel: number
  currentInterval: number
  checksCount: number
  lastCheck: Date | null
  startMonitoring: () => void
  stopMonitoring: () => void
  checkNow: () => Promise<void>
}

// Rate limiting conforme documentação SuperPay
const RATE_LIMIT_INTERVALS = [
  5 * 60 * 1000, // 5 minutos
  30 * 60 * 1000, // 30 minutos
  60 * 60 * 1000, // 1 hora
  12 * 60 * 60 * 1000, // 12 horas
  24 * 60 * 60 * 1000, // 24 horas
  48 * 60 * 60 * 1000, // 48 horas
  24 * 60 * 60 * 1000, // 24 horas (repetir até 100h)
]

const MAX_MONITORING_TIME = 100 * 60 * 60 * 1000 // 100 horas

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

  const currentInterval = enableRateLimiting
    ? RATE_LIMIT_INTERVALS[Math.min(rateLimitLevel, RATE_LIMIT_INTERVALS.length - 1)]
    : 5000 // 5 segundos se rate limiting desabilitado

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId) return

    try {
      setIsLoading(true)
      setError(null)

      if (enableDebug) {
        console.log(`🔍 Verificando status SuperPay: ${externalId}`)
      }

      const response = await fetch(`/api/superpay/payment-status?externalId=${encodeURIComponent(externalId)}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || "Erro ao consultar status")
      }

      const webhookData = data.webhook as SuperPayWebhookData | null

      if (webhookData) {
        setStatus(webhookData)
        setLastCheck(new Date())
        setChecksCount((prev) => prev + 1)

        // Verificar se o status mudou
        const statusChanged = !lastStatusRef.current || lastStatusRef.current.status_code !== webhookData.status_code

        if (statusChanged) {
          lastStatusRef.current = webhookData

          if (enableDebug) {
            console.log(`📊 Status SuperPay atualizado: ${webhookData.status_name}`)
          }

          // Chamar callbacks apropriados
          onStatusChange?.(webhookData)

          if (webhookData.is_paid) {
            onPaymentConfirmed?.(webhookData)
            setIsWaitingForWebhook(false)
          } else if (webhookData.is_denied) {
            onPaymentDenied?.(webhookData)
            setIsWaitingForWebhook(false)
          } else if (webhookData.is_expired) {
            onPaymentExpired?.(webhookData)
            setIsWaitingForWebhook(false)
          } else if (webhookData.is_canceled) {
            onPaymentCanceled?.(webhookData)
            setIsWaitingForWebhook(false)
          }

          // Parar monitoramento se status for crítico
          if (webhookData.is_critical) {
            stopMonitoring()
          }
        }

        // Verificar se token expirou
        if (webhookData.expires_at && new Date(webhookData.expires_at) < new Date()) {
          if (enableDebug) {
            console.log("⏰ Token SuperPay expirado")
          }
          setRateLimitLevel((prev) => Math.min(prev + 1, RATE_LIMIT_INTERVALS.length - 1))
        }
      } else {
        if (enableDebug) {
          console.log("⏳ Aguardando webhook SuperPay...")
        }
        setIsWaitingForWebhook(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)

      if (enableDebug) {
        console.error("❌ Erro ao verificar status SuperPay:", errorMessage)
      }

      // Aumentar rate limit em caso de erro
      if (enableRateLimiting) {
        setRateLimitLevel((prev) => Math.min(prev + 1, RATE_LIMIT_INTERVALS.length - 1))
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    externalId,
    enableDebug,
    enableRateLimiting,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onStatusChange,
  ])

  const startMonitoring = useCallback(() => {
    if (!externalId) return

    stopMonitoring() // Limpar interval anterior

    startTimeRef.current = new Date()
    setIsWaitingForWebhook(true)
    setRateLimitLevel(0)
    setChecksCount(0)

    if (enableDebug) {
      console.log(`🚀 Iniciando monitoramento SuperPay: ${externalId}`)
    }

    // Primeira verificação imediata
    checkPaymentStatus()

    // Configurar verificações periódicas
    const scheduleNextCheck = () => {
      // Verificar se excedeu tempo máximo de monitoramento
      if (startTimeRef.current && Date.now() - startTimeRef.current.getTime() > MAX_MONITORING_TIME) {
        if (enableDebug) {
          console.log("⏰ Tempo máximo de monitoramento SuperPay atingido (100h)")
        }
        stopMonitoring()
        return
      }

      intervalRef.current = setTimeout(() => {
        checkPaymentStatus().then(() => {
          // Agendar próxima verificação se ainda estiver monitorando
          if (isWaitingForWebhook && intervalRef.current) {
            scheduleNextCheck()
          }
        })
      }, currentInterval)
    }

    scheduleNextCheck()
  }, [externalId, enableDebug, checkPaymentStatus, currentInterval, isWaitingForWebhook])

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
      intervalRef.current = null
    }
    setIsWaitingForWebhook(false)

    if (enableDebug) {
      console.log("⏹️ Monitoramento SuperPay parado")
    }
  }, [enableDebug])

  const checkNow = useCallback(async () => {
    await checkPaymentStatus()
  }, [checkPaymentStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    status,
    isLoading,
    error,
    isWaitingForWebhook,
    isPaid: status?.is_paid || false,
    isDenied: status?.is_denied || false,
    isExpired: status?.is_expired || false,
    isCanceled: status?.is_canceled || false,
    isRefunded: status?.is_refunded || false,
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
