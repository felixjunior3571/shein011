"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  isRefunded: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string | null
  lastUpdate: string
  externalId: string
  invoiceId: string
  source: string
}

interface WebhookMonitorOptions {
  externalId: string | null
  checkInterval?: number
  maxChecks?: number
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  onError?: (error: string) => void
  enableDebug?: boolean
}

export function usePureWebhookMonitor({
  externalId,
  checkInterval = 3000, // 3 segundos
  maxChecks = 100, // Máximo 100 verificações (5 minutos)
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onError,
  enableDebug = false,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const processedPayments = useRef<Set<string>>(new Set())

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[Pure Webhook Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkWebhookStatus = useCallback(async () => {
    if (!externalId) {
      log("❌ External ID não fornecido")
      return
    }

    if (checkCount >= maxChecks) {
      log(`⏰ Máximo de verificações atingido: ${maxChecks}`)
      setIsWaitingForWebhook(false)
      setError("Tempo limite de verificação atingido")
      return
    }

    // Verificar se já foi processado
    if (processedPayments.current.has(externalId)) {
      log("✅ Pagamento já processado, parando monitoramento")
      setIsWaitingForWebhook(false)
      return
    }

    try {
      log(`🔍 Verificação ${checkCount + 1}/${maxChecks} - External ID: ${externalId}`)

      // Usar endpoint GET do webhook que consulta o cache global
      const response = await fetch(`/api/superpaybr/webhook?externalId=${encodeURIComponent(externalId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      setCheckCount((prev) => prev + 1)
      setLastCheck(new Date().toISOString())

      if (response.ok) {
        const result = await response.json()
        log("📥 Resposta do webhook:", result)

        if (result.success && result.data) {
          const newStatus = result.data
          setStatus(newStatus)
          setError(null)

          log(`📊 Status obtido: ${newStatus.statusName} (${newStatus.statusCode})`)

          // Verificar status finais e disparar callbacks
          if (newStatus.isPaid) {
            log("🎉 Pagamento confirmado via webhook!")
            processedPayments.current.add(externalId)
            setIsWaitingForWebhook(false)
            onPaymentConfirmed?.(newStatus)
            return
          } else if (newStatus.isDenied) {
            log("❌ Pagamento negado via webhook!")
            processedPayments.current.add(externalId)
            setIsWaitingForWebhook(false)
            onPaymentDenied?.(newStatus)
            return
          } else if (newStatus.isExpired) {
            log("⏰ Pagamento vencido via webhook!")
            processedPayments.current.add(externalId)
            setIsWaitingForWebhook(false)
            onPaymentExpired?.(newStatus)
            return
          } else if (newStatus.isCanceled) {
            log("🚫 Pagamento cancelado via webhook!")
            processedPayments.current.add(externalId)
            setIsWaitingForWebhook(false)
            onPaymentCanceled?.(newStatus)
            return
          } else if (newStatus.isRefunded) {
            log("🔄 Pagamento estornado via webhook!")
            processedPayments.current.add(externalId)
            setIsWaitingForWebhook(false)
            onPaymentRefunded?.(newStatus)
            return
          }
        } else {
          log("⏳ Pagamento ainda não processado via webhook")
        }
      } else if (response.status === 404) {
        log("⏳ Webhook ainda não recebido")
      } else if (response.status === 429) {
        log("🚫 Rate limit atingido, aguardando...")
        setError("Rate limit atingido")
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("❌ Erro ao verificar webhook:", errorMessage)
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [
    externalId,
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

  // Iniciar monitoramento automaticamente
  useEffect(() => {
    if (
      !externalId ||
      isWaitingForWebhook ||
      processedPayments.current.has(externalId) ||
      status?.isPaid ||
      status?.isDenied ||
      status?.isExpired ||
      status?.isCanceled
    ) {
      return
    }

    log(`🚀 Iniciando monitoramento webhook: ${externalId} (intervalo: ${checkInterval}ms)`)
    setIsWaitingForWebhook(true)
    setError(null)
    setCheckCount(0)

    // Verificação imediata
    checkWebhookStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkWebhookStatus, checkInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [externalId, isWaitingForWebhook, status, checkInterval, checkWebhookStatus, log])

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
    checkCount,
    maxChecks,
    lastCheck,
    // Computed properties para facilitar acesso
    isPaid: status?.isPaid || false,
    isDenied: status?.isDenied || false,
    isExpired: status?.isExpired || false,
    isCanceled: status?.isCanceled || false,
    isRefunded: status?.isRefunded || false,
    statusName: status?.statusName || "Aguardando",
  }
}
