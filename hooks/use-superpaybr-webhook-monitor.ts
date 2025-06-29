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
  onPaid?: () => void
  onDenied?: () => void
  onRefunded?: () => void
  onExpired?: () => void
  onCanceled?: () => void
  onStatusChange?: (status: PaymentStatus) => void
  enabled?: boolean
  interval?: number
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  onPaid,
  onDenied,
  onRefunded,
  onExpired,
  onCanceled,
  onStatusChange,
  enabled = true,
  interval = 5000, // 5 segundos
}: UseSuperpaybrWebhookMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbacksExecutedRef = useRef<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)

  const checkPaymentStatus = async () => {
    if (!externalId || !enabled) return

    try {
      setIsLoading(true)
      setError(null)

      // Cancelar requisição anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      console.log(`🔍 Verificando status SuperPayBR: ${externalId}`)

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
        console.log(`📊 Status SuperPayBR atualizado: ${newStatus.statusName}`)

        if (newStatus.isPaid && onPaid) {
          console.log("🎉 Executando callback de pagamento confirmado")
          onPaid()
        } else if (newStatus.isDenied && onDenied) {
          console.log("❌ Executando callback de pagamento negado")
          onDenied()
        } else if (newStatus.isRefunded && onRefunded) {
          console.log("↩️ Executando callback de pagamento estornado")
          onRefunded()
        } else if (newStatus.isExpired && onExpired) {
          console.log("⏰ Executando callback de pagamento vencido")
          onExpired()
        } else if (newStatus.isCanceled && onCanceled) {
          console.log("🚫 Executando callback de pagamento cancelado")
          onCanceled()
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
          console.log("✅ Status final atingido, parando monitoramento SuperPayBR")
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return // Requisição cancelada, não é erro
      }

      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      console.error("❌ Erro no monitoramento SuperPayBR:", errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!enabled || !externalId) return

    console.log(`🚀 Iniciando monitoramento SuperPayBR: ${externalId}`)

    // Verificação inicial
    checkPaymentStatus()

    // Configurar intervalo
    intervalRef.current = setInterval(checkPaymentStatus, interval)

    return () => {
      if (intervalRef.current) {
        console.log(`🛑 Parando monitoramento SuperPayBR: ${externalId}`)
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [externalId, enabled, interval])

  return {
    status,
    isLoading,
    error,
    checkPaymentStatus,
  }
}
