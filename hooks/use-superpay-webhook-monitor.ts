"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  external_id: string
  invoice_id: string
  status_code: number
  status_title: string
  status_description: string
  amount: number
  payment_date: string | null
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  last_check: string
}

interface UseSuperpayWebhookMonitorProps {
  externalId?: string
  onPaymentConfirmed?: (status: PaymentStatus) => void
  onPaymentDenied?: (status: PaymentStatus) => void
  onPaymentExpired?: (status: PaymentStatus) => void
  onPaymentCanceled?: (status: PaymentStatus) => void
  onPaymentRefunded?: (status: PaymentStatus) => void
  enabled?: boolean
  debug?: boolean
}

// Rate limiting inteligente para evitar bloqueio da SuperPay
const RATE_LIMIT_INTERVALS = [
  5000, // 5s - primeiras 10 verificações
  10000, // 10s - próximas 10 verificações
  30000, // 30s - próximas 10 verificações
  60000, // 1min - próximas 10 verificações
  120000, // 2min - próximas 10 verificações
  300000, // 5min - próximas 10 verificações
  600000, // 10min - próximas 10 verificações
  600000, // 10min - restante
]

const MAX_CHECKS = 120 // Máximo 120 verificações (2 horas)

export function useSuperpayWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enabled = true,
  debug = false,
}: UseSuperpayWebhookMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [checkCount, setCheckCount] = useState(0)
  const [maxChecks] = useState(MAX_CHECKS)
  const [currentInterval, setCurrentInterval] = useState(RATE_LIMIT_INTERVALS[0])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[SuperPay Monitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  const calculateInterval = useCallback((checkNumber: number) => {
    const intervalIndex = Math.min(Math.floor(checkNumber / 10), RATE_LIMIT_INTERVALS.length - 1)
    return RATE_LIMIT_INTERVALS[intervalIndex]
  }, [])

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !isActiveRef.current) {
      return
    }

    try {
      setIsMonitoring(true)
      setError(null)

      log(`Verificação ${checkCount + 1}/${maxChecks}`, { externalId })

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${encodeURIComponent(externalId)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Erro na consulta")
      }

      if (data.success && data.found) {
        const newStatus = data.data
        setStatus(newStatus)

        log("Status recebido:", newStatus)

        // Verificar se é um status final
        const isFinalStatus =
          newStatus.is_paid ||
          newStatus.is_denied ||
          newStatus.is_expired ||
          newStatus.is_canceled ||
          newStatus.is_refunded

        if (isFinalStatus) {
          log("Status final detectado, parando monitoramento")
          setIsMonitoring(false)
          isActiveRef.current = false

          // Chamar callbacks apropriados
          if (newStatus.is_paid && onPaymentConfirmed) {
            onPaymentConfirmed(newStatus)
          } else if (newStatus.is_denied && onPaymentDenied) {
            onPaymentDenied(newStatus)
          } else if (newStatus.is_expired && onPaymentExpired) {
            onPaymentExpired(newStatus)
          } else if (newStatus.is_canceled && onPaymentCanceled) {
            onPaymentCanceled(newStatus)
          } else if (newStatus.is_refunded && onPaymentRefunded) {
            onPaymentRefunded(newStatus)
          }

          return
        }
      } else {
        // Pagamento não encontrado ainda
        setStatus({
          external_id: externalId,
          invoice_id: "",
          status_code: 1,
          status_title: "Aguardando Pagamento",
          status_description: "Aguardando confirmação via webhook",
          amount: 0,
          payment_date: null,
          is_paid: false,
          is_denied: false,
          is_expired: false,
          is_canceled: false,
          is_refunded: false,
          last_check: new Date().toISOString(),
        })
      }

      // Incrementar contador e calcular próximo intervalo
      const newCheckCount = checkCount + 1
      setCheckCount(newCheckCount)
      setProgress((newCheckCount / maxChecks) * 100)

      // Verificar se atingiu o máximo de verificações
      if (newCheckCount >= maxChecks) {
        log("Máximo de verificações atingido")
        setIsMonitoring(false)
        isActiveRef.current = false
        setError("Tempo limite de monitoramento atingido")
        return
      }

      // Calcular próximo intervalo com rate limiting
      const nextInterval = calculateInterval(newCheckCount)
      setCurrentInterval(nextInterval)

      log(`Próxima verificação em ${nextInterval / 1000}s`)

      // Agendar próxima verificação
      if (isActiveRef.current) {
        timeoutRef.current = setTimeout(() => {
          checkPaymentStatus()
        }, nextInterval)
      }
    } catch (error) {
      log("Erro na verificação:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")

      // Em caso de erro, tentar novamente com intervalo maior
      const retryInterval = Math.min(currentInterval * 2, 300000) // Max 5 minutos
      setCurrentInterval(retryInterval)

      if (isActiveRef.current && checkCount < maxChecks) {
        timeoutRef.current = setTimeout(() => {
          checkPaymentStatus()
        }, retryInterval)
      }
    } finally {
      setIsMonitoring(false)
    }
  }, [
    externalId,
    checkCount,
    maxChecks,
    currentInterval,
    calculateInterval,
    log,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Iniciar monitoramento
  useEffect(() => {
    if (enabled && externalId && isActiveRef.current) {
      log("Iniciando monitoramento SuperPay", { externalId })
      checkPaymentStatus()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, externalId, checkPaymentStatus, log])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Função para verificação manual
  const checkNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    await checkPaymentStatus()
  }, [checkPaymentStatus])

  return {
    status,
    isMonitoring,
    checkCount,
    maxChecks,
    currentInterval,
    error,
    progress,
    checkNow,
  }
}
