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
  checkInterval?: number // Intervalo LONGO para verificação pontual
  maxChecks?: number // Máximo de verificações para evitar rate limit
}

export function useWebhookPaymentDetector({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enabled = true,
  checkInterval = 30000, // 30 segundos (muito mais conservador)
  maxChecks = 20, // Máximo 20 verificações (10 minutos)
}: UseWebhookPaymentDetectorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [checkCount, setCheckCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasTriggeredCallbackRef = useRef<boolean>(false)

  // Função para verificar status (PONTUAL, não polling agressivo)
  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !enabled || checkCount >= maxChecks) {
      return
    }

    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()

      console.log(`🔍 [WebhookDetector] Verificação pontual #${checkCount + 1}/${maxChecks} para: ${externalId}`)

      const response = await fetch(`/api/superpay/payment-status?externalId=${externalId}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.warn("⚠️ [WebhookDetector] Rate limit atingido - parando verificações")
          setIsDetecting(false)
          setError("Rate limit atingido. Aguarde o webhook.")
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setLastCheck(new Date())
      setCheckCount((prev) => prev + 1)

      console.log(`📡 [WebhookDetector] Resposta:`, {
        found: result.found,
        isPaid: result.data?.isPaid,
        status: result.data?.statusName,
        source: result.data?.source,
        check: checkCount + 1,
      })

      if (result.success && result.found && result.data) {
        const paymentData = result.data
        setStatus(paymentData)
        setError(null)

        // Verificar se já executou callback para evitar duplicatas
        if (hasTriggeredCallbackRef.current) {
          return
        }

        // Verificar status e executar callbacks
        if (paymentData.isPaid) {
          console.log("🎉 [WebhookDetector] PAGAMENTO CONFIRMADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentConfirmed?.(paymentData)
          return
        }

        if (paymentData.isDenied) {
          console.log("❌ [WebhookDetector] PAGAMENTO NEGADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentDenied?.(paymentData)
          return
        }

        if (paymentData.isExpired) {
          console.log("⏰ [WebhookDetector] PAGAMENTO EXPIRADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentExpired?.(paymentData)
          return
        }

        if (paymentData.isCanceled) {
          console.log("🚫 [WebhookDetector] PAGAMENTO CANCELADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentCanceled?.(paymentData)
          return
        }

        if (paymentData.isRefunded) {
          console.log("🔄 [WebhookDetector] PAGAMENTO ESTORNADO!")
          hasTriggeredCallbackRef.current = true
          setIsDetecting(false)
          onPaymentRefunded?.(paymentData)
          return
        }

        console.log(`⏳ [WebhookDetector] Aguardando webhook... Status: ${paymentData.statusName}`)
      } else {
        console.log(`🔍 [WebhookDetector] Aguardando webhook (verificação ${checkCount + 1}/${maxChecks})`)
      }

      // Parar se atingiu o máximo de verificações
      if (checkCount + 1 >= maxChecks) {
        console.log("⏰ [WebhookDetector] Máximo de verificações atingido - aguardando apenas webhook")
        setIsDetecting(false)
        setError("Aguardando notificação via webhook...")
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("🚫 [WebhookDetector] Requisição cancelada")
        return
      }

      console.error("❌ [WebhookDetector] Erro na verificação:", error)
      setError(error.message || "Erro na verificação do pagamento")
      setCheckCount((prev) => prev + 1)

      // Parar após muitos erros
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

  // Iniciar detecção
  const startDetection = useCallback(() => {
    if (!externalId || !enabled || isDetecting) return

    console.log(`🚀 [WebhookDetector] Iniciando detecção para: ${externalId}`)
    console.log(`⏰ [WebhookDetector] Intervalo conservador: ${checkInterval}ms (${checkInterval / 1000}s)`)
    console.log(`🔢 [WebhookDetector] Máximo de verificações: ${maxChecks}`)

    setIsDetecting(true)
    setCheckCount(0)
    setError(null)
    hasTriggeredCallbackRef.current = false

    // Primeira verificação imediata
    checkPaymentStatus()

    // Configurar intervalo CONSERVADOR
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)
  }, [externalId, enabled, isDetecting, checkPaymentStatus, checkInterval, maxChecks])

  // Parar detecção
  const stopDetection = useCallback(() => {
    console.log("🛑 [WebhookDetector] Parando detecção")
    setIsDetecting(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Verificação manual (para botões)
  const checkNow = useCallback(() => {
    if (checkCount >= maxChecks) {
      console.log("⚠️ [WebhookDetector] Máximo de verificações atingido")
      setError("Máximo de verificações atingido. Aguarde o webhook.")
      return
    }

    console.log("🔄 [WebhookDetector] Verificação manual solicitada")
    checkPaymentStatus()
  }, [checkPaymentStatus, checkCount, maxChecks])

  // Efeito para iniciar/parar detecção
  useEffect(() => {
    if (enabled && externalId && !isDetecting && !hasTriggeredCallbackRef.current) {
      startDetection()
    }

    return () => {
      stopDetection()
    }
  }, [enabled, externalId, startDetection, stopDetection, isDetecting])

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
