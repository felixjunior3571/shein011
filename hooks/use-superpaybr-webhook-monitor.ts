"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string | null
}

interface WebhookMonitorOptions {
  externalId: string | null
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackExecutedRef = useRef<boolean>(false)
  const isCheckingRef = useRef<boolean>(false)
  const requestCountRef = useRef<number>(0)
  const lastRequestTimeRef = useRef<number>(0)

  const checkPaymentStatus = useCallback(async () => {
    // ⚠️ IMPORTANTE: Evitar múltiplas requisições simultâneas
    if (!externalId || callbackExecutedRef.current || isCheckingRef.current) {
      return
    }

    // ⚠️ RATE LIMITING: Máximo 1 requisição por 10 segundos
    const now = Date.now()
    if (now - lastRequestTimeRef.current < 10000) {
      if (enableDebug) {
        console.log("⏳ Rate limit ativo - aguardando...")
      }
      return
    }

    // ⚠️ LIMITE de requisições por sessão
    if (requestCountRef.current > 50) {
      if (enableDebug) {
        console.log("🛑 Limite de requisições atingido")
      }
      return
    }

    try {
      isCheckingRef.current = true
      requestCountRef.current++
      lastRequestTimeRef.current = now
      setError(null)
      setLastCheck(new Date())

      if (enableDebug) {
        console.log(`🔍 Verificando status SuperPayBR (${requestCountRef.current}/50):`, externalId)
      }

      // ⚠️ TIMEOUT agressivo para evitar requisições travadas
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 segundos timeout

      const response = await fetch(`/api/superpaybr/check-payment?external_id=${externalId}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        const paymentStatus: PaymentStatus = {
          isPaid: data.isPaid || false,
          isDenied: data.isDenied || false,
          isRefunded: data.isRefunded || false,
          isExpired: data.isExpired || false,
          isCanceled: data.isCanceled || false,
          statusCode: data.statusCode || 1,
          statusName: data.statusName || "pending",
          amount: data.amount || 0,
          paymentDate: data.paymentDate || null,
        }

        setStatus(paymentStatus)

        // ⚠️ IMPORTANTE: Executar callbacks apenas uma vez
        if (!callbackExecutedRef.current) {
          if (paymentStatus.isPaid && onPaymentConfirmed) {
            if (enableDebug) {
              console.log("✅ SuperPayBR: Pagamento confirmado!")
            }
            callbackExecutedRef.current = true
            setIsWaitingForWebhook(false)
            onPaymentConfirmed(paymentStatus)
          } else if (paymentStatus.isDenied && onPaymentDenied) {
            if (enableDebug) {
              console.log("❌ SuperPayBR: Pagamento negado!")
            }
            callbackExecutedRef.current = true
            setIsWaitingForWebhook(false)
            onPaymentDenied(paymentStatus)
          } else if (paymentStatus.isExpired && onPaymentExpired) {
            if (enableDebug) {
              console.log("⏰ SuperPayBR: Pagamento vencido!")
            }
            callbackExecutedRef.current = true
            setIsWaitingForWebhook(false)
            onPaymentExpired(paymentStatus)
          } else if (paymentStatus.isCanceled && onPaymentCanceled) {
            if (enableDebug) {
              console.log("🚫 SuperPayBR: Pagamento cancelado!")
            }
            callbackExecutedRef.current = true
            setIsWaitingForWebhook(false)
            onPaymentCanceled(paymentStatus)
          } else if (paymentStatus.isRefunded && onPaymentRefunded) {
            if (enableDebug) {
              console.log("↩️ SuperPayBR: Pagamento estornado!")
            }
            callbackExecutedRef.current = true
            setIsWaitingForWebhook(false)
            onPaymentRefunded(paymentStatus)
          } else {
            // Status ainda pendente
            setIsWaitingForWebhook(true)
          }
        }

        // ⚠️ PARAR monitoramento se status final foi atingido
        if (
          paymentStatus.isPaid ||
          paymentStatus.isDenied ||
          paymentStatus.isExpired ||
          paymentStatus.isCanceled ||
          paymentStatus.isRefunded
        ) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            if (enableDebug) {
              console.log("🛑 Monitoramento SuperPayBR parado - status final atingido")
            }
          }
        }
      } else {
        throw new Error(data.error || "Erro ao verificar status SuperPayBR")
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        if (enableDebug) {
          console.log("⏰ Timeout na verificação SuperPayBR")
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido SuperPayBR"
        setError(errorMessage)
        if (enableDebug) {
          console.error("❌ Erro ao verificar SuperPayBR:", errorMessage)
        }
      }
    } finally {
      isCheckingRef.current = false
    }
  }, [
    externalId,
    enableDebug,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // ⚠️ IMPORTANTE: Iniciar monitoramento apenas quando necessário
  useEffect(() => {
    if (!externalId || callbackExecutedRef.current) {
      return
    }

    if (enableDebug) {
      console.log("🚀 Iniciando monitoramento SuperPayBR:", externalId)
    }

    setIsWaitingForWebhook(true)
    callbackExecutedRef.current = false
    requestCountRef.current = 0
    lastRequestTimeRef.current = 0

    // Verificação inicial após 5 segundos
    const initialTimeout = setTimeout(() => {
      checkPaymentStatus()
    }, 5000)

    // ⚠️ IMPORTANTE: Intervalo muito maior para evitar ERR_INSUFFICIENT_RESOURCES
    intervalRef.current = setInterval(() => {
      if (!callbackExecutedRef.current) {
        checkPaymentStatus()
      }
    }, 30000) // 30 segundos entre verificações

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isCheckingRef.current = false
      if (enableDebug) {
        console.log("🛑 Monitoramento SuperPayBR limpo")
      }
    }
  }, [externalId, checkPaymentStatus, enableDebug])

  // ⚠️ CLEANUP ao desmontar componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      isCheckingRef.current = false
    }
  }, [])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkPaymentStatus,
  }
}
