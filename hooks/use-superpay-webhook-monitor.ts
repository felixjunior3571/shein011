"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

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

interface UseSuperpayWebhookMonitorProps {
  externalId: string
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  enabled?: boolean
  interval?: number
  maxAttempts?: number
}

export function useSuperpayWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  enabled = true,
  interval = 3000, // 3 segundos
  maxAttempts = 200, // 10 minutos máximo
}: UseSuperpayWebhookMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()

  // Função para verificar status do pagamento
  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !enabled) return

    try {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Criar novo AbortController
      abortControllerRef.current = new AbortController()

      console.log(`🔍 [SuperPayMonitor] Verificação #${attempts + 1} para: ${externalId}`)

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
      setLastCheck(new Date().toISOString())
      setAttempts((prev) => prev + 1)

      console.log(`📡 [SuperPayMonitor] Resposta da API:`, {
        found: result.found,
        isPaid: result.data?.isPaid,
        status: result.data?.statusName,
        source: result.data?.source,
        attempt: attempts + 1,
      })

      if (result.success && result.found && result.data) {
        const paymentData = result.data
        setStatus(paymentData)
        setError(null)

        // Verificar se o pagamento foi confirmado
        if (paymentData.isPaid) {
          console.log("🎉 [SuperPayMonitor] PAGAMENTO CONFIRMADO!")
          setIsMonitoring(false)

          if (onPaymentConfirmed) {
            onPaymentConfirmed(paymentData)
          }

          // Redirecionar para página de sucesso
          router.push("/form/success")
          return
        }

        // Verificar se o pagamento foi negado
        if (paymentData.isDenied) {
          console.log("❌ [SuperPayMonitor] PAGAMENTO NEGADO!")
          setIsMonitoring(false)

          if (onPaymentDenied) {
            onPaymentDenied(paymentData)
          }
          return
        }

        // Verificar se o pagamento expirou
        if (paymentData.isExpired) {
          console.log("⏰ [SuperPayMonitor] PAGAMENTO EXPIRADO!")
          setIsMonitoring(false)

          if (onPaymentExpired) {
            onPaymentExpired(paymentData)
          }
          return
        }

        console.log(`⏳ [SuperPayMonitor] Aguardando pagamento... Status: ${paymentData.statusName}`)
      } else {
        console.log(`🔍 [SuperPayMonitor] Pagamento ainda não encontrado (tentativa ${attempts + 1})`)
      }

      // Verificar se atingiu o máximo de tentativas
      if (attempts + 1 >= maxAttempts) {
        console.log("⏰ [SuperPayMonitor] Máximo de tentativas atingido")
        setIsMonitoring(false)
        setError("Tempo limite de verificação atingido")
        return
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("🚫 [SuperPayMonitor] Requisição cancelada")
        return
      }

      console.error("❌ [SuperPayMonitor] Erro na verificação:", error)
      setError(error.message || "Erro na verificação do pagamento")
      setAttempts((prev) => prev + 1)

      // Parar monitoramento após muitos erros
      if (attempts + 1 >= maxAttempts) {
        setIsMonitoring(false)
      }
    }
  }, [externalId, enabled, attempts, maxAttempts, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, router])

  // Iniciar monitoramento
  const startMonitoring = useCallback(() => {
    if (!externalId || !enabled || isMonitoring) return

    console.log(`🚀 [SuperPayMonitor] Iniciando monitoramento para: ${externalId}`)
    setIsMonitoring(true)
    setAttempts(0)
    setError(null)

    // Primeira verificação imediata
    checkPaymentStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkPaymentStatus, interval)
  }, [externalId, enabled, isMonitoring, checkPaymentStatus, interval])

  // Parar monitoramento
  const stopMonitoring = useCallback(() => {
    console.log("🛑 [SuperPayMonitor] Parando monitoramento")
    setIsMonitoring(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Efeito para iniciar/parar monitoramento
  useEffect(() => {
    if (enabled && externalId && !isMonitoring) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [enabled, externalId, startMonitoring, stopMonitoring, isMonitoring])

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    status,
    isMonitoring,
    attempts,
    error,
    lastCheck,
    startMonitoring,
    stopMonitoring,
    maxAttempts,
    progress: Math.min((attempts / maxAttempts) * 100, 100),
  }
}
