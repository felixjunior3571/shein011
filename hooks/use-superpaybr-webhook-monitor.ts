"use client"

import { useEffect, useRef, useState } from "react"

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
  timestamp: string
}

interface UseSuperpaybrWebhookMonitorProps {
  externalId: string | null
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  onStatusChange?: (status: PaymentStatus) => void
  enabled?: boolean
  interval?: number
  enableDebug?: boolean
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onStatusChange,
  enabled = true,
  interval = 3000, // 3 segundos para evitar sobrecarga
  enableDebug = false,
}: UseSuperpaybrWebhookMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbacksExecutedRef = useRef<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)

  const checkPaymentStatus = async () => {
    if (!externalId || !enabled) return

    try {
      setError(null)
      setLastCheck(new Date())

      // Cancelar requisição anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      if (enableDebug) {
        console.log(`🔍 Verificando status SuperPayBR: ${externalId}`)
      }

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${externalId}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao verificar status")
      }

      const newStatus: PaymentStatus = {
        isPaid: data.isPaid || false,
        isDenied: data.isDenied || false,
        isRefunded: data.isRefunded || false,
        isExpired: data.isExpired || false,
        isCanceled: data.isCanceled || false,
        statusCode: data.statusCode || 1,
        statusName: data.statusName || "pending",
        amount: data.amount || 0,
        paymentDate: data.paymentDate,
        timestamp: data.timestamp || new Date().toISOString(),
      }

      setStatus(newStatus)

      // Executar callbacks apenas uma vez por status
      const statusKey = `${externalId}_${newStatus.statusCode}_${newStatus.statusName}`

      if (!callbacksExecutedRef.current.has(statusKey)) {
        if (enableDebug) {
          console.log(`📊 Status SuperPayBR atualizado: ${newStatus.statusName}`)
        }

        if (newStatus.isPaid && onPaymentConfirmed) {
          if (enableDebug) {
            console.log("🎉 Executando callback de pagamento confirmado")
          }
          onPaymentConfirmed(newStatus)
        } else if (newStatus.isDenied && onPaymentDenied) {
          if (enableDebug) {
            console.log("❌ Executando callback de pagamento negado")
          }
          onPaymentDenied(newStatus)
        } else if (newStatus.isRefunded && onPaymentRefunded) {
          if (enableDebug) {
            console.log("↩️ Executando callback de pagamento estornado")
          }
          onPaymentRefunded(newStatus)
        } else if (newStatus.isExpired && onPaymentExpired) {
          if (enableDebug) {
            console.log("⏰ Executando callback de pagamento vencido")
          }
          onPaymentExpired(newStatus)
        } else if (newStatus.isCanceled && onPaymentCanceled) {
          if (enableDebug) {
            console.log("🚫 Executando callback de pagamento cancelado")
          }
          onPaymentCanceled(newStatus)
        }

        if (onStatusChange) {
          onStatusChange(newStatus)
        }

        callbacksExecutedRef.current.add(statusKey)

        // Parar monitoramento se status final
        if (
          newStatus.isPaid ||
          newStatus.isDenied ||
          newStatus.isRefunded ||
          newStatus.isExpired ||
          newStatus.isCanceled
        ) {
          if (enableDebug) {
            console.log("✅ Status final atingido, parando monitoramento SuperPayBR")
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }

      // Atualizar estado de espera
      setIsWaitingForWebhook(
        !newStatus.isPaid &&
          !newStatus.isDenied &&
          !newStatus.isExpired &&
          !newStatus.isCanceled &&
          !newStatus.isRefunded,
      )
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return // Requisição cancelada, não é erro
      }

      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      if (enableDebug) {
        console.error("❌ Erro no monitoramento SuperPayBR:", errorMessage)
      }
      setError(errorMessage)
    }
  }

  useEffect(() => {
    if (!enabled || !externalId) return

    if (enableDebug) {
      console.log(`🚀 Iniciando monitoramento SuperPayBR: ${externalId}`)
    }

    // Verificação inicial
    checkPaymentStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkPaymentStatus, interval)

    return () => {
      if (intervalRef.current) {
        if (enableDebug) {
          console.log(`🛑 Parando monitoramento SuperPayBR: ${externalId}`)
        }
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [externalId, enabled, interval, enableDebug])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkPaymentStatus,
  }
}
