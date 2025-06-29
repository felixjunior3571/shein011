"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PaymentData {
  externalId: string
  invoiceId: string
  token: string
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  amount: number
  paymentDate: string
  statusCode: number
  statusName: string
  receivedAt: string
}

interface UseSuperpayWebhookMonitorProps {
  externalId: string | null
  enabled?: boolean
  interval?: number
  maxRetries?: number
  backoffMultiplier?: number
  onPaid?: (data: PaymentData) => void
  onDenied?: (data: PaymentData) => void
  onRefunded?: (data: PaymentData) => void
  onExpired?: (data: PaymentData) => void
  onCanceled?: (data: PaymentData) => void
  onError?: (error: string) => void
}

export function useSuperpayWebhookMonitor({
  externalId,
  enabled = true,
  interval = 3000,
  maxRetries = 5,
  backoffMultiplier = 1.5,
  onPaid,
  onDenied,
  onRefunded,
  onExpired,
  onCanceled,
  onError,
}: UseSuperpayWebhookMonitorProps) {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkCount, setCheckCount] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [currentInterval, setCurrentInterval] = useState(interval)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Função otimizada para verificar status
  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !enabled) return

    // Cancelar requisição anterior se ainda estiver pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setIsLoading(true)
      setError(null)

      console.log(`🔍 [${checkCount + 1}] Verificando SuperPay: ${externalId}`)

      const response = await fetch(`/api/superpay/payment-status?externalId=${externalId}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setCheckCount((prev) => prev + 1)
      setRetryCount(0) // Reset retry count on success
      setCurrentInterval(interval) // Reset interval

      if (result.success && result.found) {
        const { data } = result
        setPaymentData(data)

        console.log(`✅ [${checkCount + 1}] Status SuperPay:`, {
          externalId: data.externalId,
          isPaid: data.isPaid,
          isDenied: data.isDenied,
          isExpired: data.isExpired,
          isCanceled: data.isCanceled,
          isRefunded: data.isRefunded,
          statusCode: data.statusCode,
          source: result.source,
          processingTime: result.processing_time_ms,
        })

        // Verificar mudanças de status para evitar callbacks duplicados
        const currentStatus = `${data.isPaid}-${data.isDenied}-${data.isRefunded}-${data.isExpired}-${data.isCanceled}`

        if (lastStatusRef.current !== currentStatus) {
          lastStatusRef.current = currentStatus

          // Executar callbacks baseados no status (com try-catch para segurança)
          try {
            if (data.isPaid && onPaid) {
              console.log("🎉 Executando callback onPaid")
              onPaid(data)
            } else if (data.isDenied && onDenied) {
              console.log("❌ Executando callback onDenied")
              onDenied(data)
            } else if (data.isRefunded && onRefunded) {
              console.log("🔄 Executando callback onRefunded")
              onRefunded(data)
            } else if (data.isExpired && onExpired) {
              console.log("⏰ Executando callback onExpired")
              onExpired(data)
            } else if (data.isCanceled && onCanceled) {
              console.log("🚫 Executando callback onCanceled")
              onCanceled(data)
            }
          } catch (callbackError) {
            console.error("❌ Erro no callback:", callbackError)
            if (onError) {
              onError(`Erro no callback: ${callbackError}`)
            }
          }
        }
      } else {
        console.log(`⏳ [${checkCount + 1}] Aguardando webhook SuperPay...`)
        setPaymentData(null)
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("🚫 Requisição cancelada")
        return
      }

      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error(`❌ [${checkCount + 1}] Erro SuperPay:`, errorMessage)

      setError(errorMessage)
      setRetryCount((prev) => prev + 1)

      // Implementar backoff exponencial
      if (retryCount < maxRetries) {
        const newInterval = Math.min(currentInterval * backoffMultiplier, 30000) // Max 30s
        setCurrentInterval(newInterval)
        console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} em ${newInterval}ms`)
      } else {
        console.log(`❌ Max retries (${maxRetries}) atingido`)
        if (onError) {
          onError(`Max retries atingido: ${errorMessage}`)
        }
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [
    externalId,
    enabled,
    checkCount,
    retryCount,
    maxRetries,
    currentInterval,
    backoffMultiplier,
    onPaid,
    onDenied,
    onRefunded,
    onExpired,
    onCanceled,
    onError,
  ])

  // Configurar monitoramento automático otimizado
  useEffect(() => {
    if (!externalId || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Verificação inicial imediata
    checkPaymentStatus()

    // Configurar intervalo dinâmico
    intervalRef.current = setInterval(checkPaymentStatus, currentInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [externalId, enabled, currentInterval, checkPaymentStatus])

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Função para forçar verificação manual
  const forceCheck = useCallback(() => {
    setRetryCount(0)
    setCurrentInterval(interval)
    checkPaymentStatus()
  }, [checkPaymentStatus, interval])

  return {
    paymentData,
    isLoading,
    error,
    checkCount,
    retryCount,
    currentInterval,
    forceCheck,
    checkPaymentStatus,
  }
}
