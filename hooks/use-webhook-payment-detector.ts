"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface PaymentStatus {
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
  payId?: string
  source?: string
}

interface UseWebhookPaymentDetectorProps {
  externalId: string
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  enabled?: boolean
  checkInterval?: number
  maxChecks?: number
}

export function useWebhookPaymentDetector({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enabled = true,
  checkInterval = 60000, // 1 minuto - muito conservador
  maxChecks = 5, // Apenas 5 verificações máximo
}: UseWebhookPaymentDetectorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [checkCount, setCheckCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasTriggeredCallbackRef = useRef<boolean>(false)
  const isInitializedRef = useRef<boolean>(false)

  // Função para verificar status (APENAS quando necessário)
  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !enabled || checkCount >= maxChecks || hasTriggeredCallbackRef.current) {
      return
    }

    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()

      console.log(`🔍 [Detector] Verificação ${checkCount + 1}/${maxChecks} para: ${externalId}`)

      const response = await fetch(`/api/superpay/payment-status?externalId=${externalId}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("⚠️ [Detector] Rate limit - parando verificações")
          setIsDetecting(false)
          setError("Rate limit atingido. Aguardando webhook.")
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      setLastCheck(new Date())
      setCheckCount((prev) => prev + 1)

      if (result.success && result.found && result.data) {
        const paymentData = result.data
        setStatus(paymentData)
        setError(null)

        // Verificar se já executou callback
        if (hasTriggeredCallbackRef.current) {
          return
        }

        // Verificar status e executar callbacks
        if (paymentData.isPaid) {
          console.log("🎉 [Detector] PAGAMENTO CONFIRMADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentConfirmed?.(paymentData)
          return
        }

        if (paymentData.isDenied) {
          console.log("❌ [Detector] PAGAMENTO NEGADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentDenied?.(paymentData)
          return
        }

        if (paymentData.isExpired) {
          console.log("⏰ [Detector] PAGAMENTO EXPIRADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentExpired?.(paymentData)
          return
        }

        if (paymentData.isCanceled) {
          console.log("🚫 [Detector] PAGAMENTO CANCELADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentCanceled?.(paymentData)
          return
        }

        if (paymentData.isRefunded) {
          console.log("🔄 [Detector] PAGAMENTO ESTORNADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentRefunded?.(paymentData)
          return
        }
      }

      // Parar se atingiu o máximo
      if (checkCount + 1 >= maxChecks) {
        console.log("⏰ [Detector] Máximo atingido - aguardando webhook")
        setIsDetecting(false)
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return
      }

      console.error("❌ [Detector] Erro:", error)
      setError(error.message || "Erro na verificação")
      setCheckCount((prev) => prev + 1)

      if (checkCount + 1 >= maxChecks) {
        setIsDetecting(false)
      }
    }
  }, [
    externalId,
    enabled,
    checkCount,
    maxChecks,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Iniciar detecção (APENAS UMA VEZ)
  const startDetection = useCallback(() => {
    if (!externalId || !enabled || isDetecting || hasTriggeredCallbackRef.current || isInitializedRef.current) {
      return
    }

    console.log(`🚀 [Detector] Iniciando para: ${externalId}`)
    console.log(`⏰ [Detector] Intervalo: ${checkInterval}ms | Máximo: ${maxChecks} verificações`)

    isInitializedRef.current = true
    setIsDetecting(true)
    setCheckCount(0)
    setError(null)

    // Primeira verificação após 5 segundos (dar tempo para o PIX ser criado)
    setTimeout(() => {
      if (!hasTriggeredCallbackRef.current) {
        checkPaymentStatus()
      }
    }, 5000)

    // Configurar intervalo conservador
    intervalRef.current = setInterval(() => {
      if (!hasTriggeredCallbackRef.current && checkCount < maxChecks) {
        checkPaymentStatus()
      }
    }, checkInterval)
  }, [externalId, enabled, isDetecting, checkPaymentStatus, checkInterval, maxChecks])

  // Parar detecção
  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setIsDetecting(false)
  }, [])

  // Verificação manual (limitada)
  const checkNow = useCallback(() => {
    if (checkCount >= maxChecks || hasTriggeredCallbackRef.current) {
      console.log("⚠️ [Detector] Verificação manual bloqueada")
      return
    }

    console.log("🔄 [Detector] Verificação manual")
    checkPaymentStatus()
  }, [checkPaymentStatus, checkCount, maxChecks])

  // Efeito para iniciar detecção (APENAS UMA VEZ)
  useEffect(() => {
    if (enabled && externalId && !isInitializedRef.current) {
      startDetection()
    }

    return () => {
      stopDetection()
    }
  }, [enabled, externalId]) // Removido startDetection e stopDetection das dependências

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return {
    status,
    isDetecting,
    checkCount,
    maxChecks,
    error,
    lastCheck,
    startDetection,
    stopDetection,
    checkNow,
    progress: Math.min((checkCount / maxChecks) * 100, 100),
    remainingChecks: Math.max(maxChecks - checkCount, 0),
  }
}
