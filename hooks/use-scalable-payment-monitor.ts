"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  external_id: string
  status: string
  payment_confirmed: boolean
  redirect_url: string | null
  redirect_type: string
  amount: number
  paid_at: string | null
  gateway?: string
  pay_id?: string
  last_update: string
  source: "memory_cache" | "database_cache" | "database_direct" | "sse"
}

interface ScalableMonitorOptions {
  externalId?: string
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onError?: (error: string) => void
  enableSSE?: boolean
  fallbackInterval?: number
  maxFallbackChecks?: number
  enableDebug?: boolean
}

export function useScalablePaymentMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onError,
  enableSSE = true,
  fallbackInterval = 10000, // 10 segundos (menos frequente)
  maxFallbackChecks = 30, // máximo 30 verificações (5 minutos)
  enableDebug = false,
}: ScalableMonitorOptions) {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionType, setConnectionType] = useState<"sse" | "polling" | "none">("none")
  const [error, setError] = useState<string | null>(null)
  const [fallbackCount, setFallbackCount] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("")

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[Scalable Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  // Verificação via API (fallback)
  const checkViaAPI = useCallback(async () => {
    if (!externalId) return

    try {
      log(`🔍 Verificação API fallback (${fallbackCount + 1}/${maxFallbackChecks}):`, externalId)

      const response = await fetch(`/api/superpaybr/check-webhook-status?external_id=${encodeURIComponent(externalId)}`)
      const result = await response.json()

      if (response.ok && result.success) {
        const data = result.data
        setPaymentStatus(data)
        setError(null)
        setFallbackCount((prev) => prev + 1)

        log("📊 Resposta API:", data)

        // Verificar mudança de status
        const currentStatusKey = `${data.payment_confirmed}-${data.status}`
        if (currentStatusKey !== lastStatusRef.current) {
          log(`🔄 Status alterado via API: ${lastStatusRef.current} → ${currentStatusKey}`)
          lastStatusRef.current = currentStatusKey

          // Processar status
          if (data.payment_confirmed && data.status === "pago") {
            log("🎉 PAGAMENTO CONFIRMADO VIA API!", data)
            onPaymentConfirmed?.(data)
            return true // Parar fallback
          }

          if (data.status === "recusado" || data.status === "cancelado") {
            log("❌ PAGAMENTO NEGADO VIA API!", data)
            onPaymentDenied?.(data)
            return true // Parar fallback
          }

          if (data.status === "vencido") {
            log("⏰ PAGAMENTO VENCIDO VIA API!", data)
            onPaymentExpired?.(data)
            return true // Parar fallback
          }
        }

        return false // Continuar fallback
      } else {
        log("⚠️ Erro na verificação API:", result)
        setError(result.error || "Erro na verificação")
        return false
      }
    } catch (err) {
      log("💥 Erro na requisição API:", err)
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      return false
    }
  }, [externalId, fallbackCount, maxFallbackChecks, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, log])

  // Conectar via SSE
  const connectSSE = useCallback(() => {
    if (!externalId || !enableSSE) return

    log("📡 Conectando via SSE...", externalId)

    try {
      const eventSource = new EventSource(
        `/api/superpaybr/payment-stream?external_id=${encodeURIComponent(externalId)}`,
      )
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        log("✅ SSE conectado com sucesso")
        setIsConnected(true)
        setConnectionType("sse")
        setError(null)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          log("📨 Mensagem SSE recebida:", data)

          if (data.type === "connected") {
            log("🔗 Confirmação de conexão SSE")
          } else if (data.type === "payment_confirmed") {
            log("🎉 PAGAMENTO CONFIRMADO VIA SSE!", data)

            const paymentData: PaymentStatus = {
              external_id: data.external_id,
              status: "pago",
              payment_confirmed: true,
              redirect_url: data.redirect_url,
              redirect_type: "checkout",
              amount: data.amount,
              paid_at: data.timestamp,
              last_update: data.timestamp,
              source: "sse",
            }

            setPaymentStatus(paymentData)
            onPaymentConfirmed?.(paymentData)
          } else if (data.type === "heartbeat") {
            log("💓 Heartbeat SSE recebido")
          }
        } catch (parseError) {
          log("❌ Erro ao parsear mensagem SSE:", parseError)
        }
      }

      eventSource.onerror = (error) => {
        log("❌ Erro na conexão SSE:", error)
        setIsConnected(false)
        setConnectionType("polling")
        setError("Erro na conexão SSE, usando fallback")

        // Fechar conexão SSE e usar fallback
        eventSource.close()
        eventSourceRef.current = null

        // Iniciar fallback polling
        startFallbackPolling()
      }
    } catch (sseError) {
      log("💥 Erro ao criar SSE:", sseError)
      setConnectionType("polling")
      startFallbackPolling()
    }
  }, [externalId, enableSSE, log, onPaymentConfirmed])

  // Iniciar polling de fallback
  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return // Já está rodando

    log("🔄 Iniciando polling de fallback...")
    setConnectionType("polling")

    // Primeira verificação imediata
    checkViaAPI().then((shouldStop) => {
      if (shouldStop) return

      // Continuar com polling
      fallbackIntervalRef.current = setInterval(async () => {
        if (fallbackCount >= maxFallbackChecks) {
          log("⏰ Máximo de verificações fallback atingido")
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current)
            fallbackIntervalRef.current = null
          }
          onError?.("Tempo limite de monitoramento atingido")
          return
        }

        const shouldStop = await checkViaAPI()
        if (shouldStop && fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current)
          fallbackIntervalRef.current = null
        }
      }, fallbackInterval)
    })
  }, [checkViaAPI, fallbackCount, maxFallbackChecks, fallbackInterval, onError, log])

  // Parar monitoramento
  const stopMonitoring = useCallback(() => {
    log("🛑 Parando monitoramento...")

    // Fechar SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // Parar polling
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current)
      fallbackIntervalRef.current = null
    }

    setIsConnected(false)
    setConnectionType("none")
  }, [log])

  // Iniciar monitoramento
  const startMonitoring = useCallback(() => {
    if (!externalId) {
      log("❌ External ID não fornecido")
      return
    }

    log("🚀 Iniciando monitoramento escalável...", {
      externalId,
      enableSSE,
      fallbackInterval,
      maxFallbackChecks,
    })

    setError(null)
    setFallbackCount(0)
    lastStatusRef.current = ""

    // Tentar SSE primeiro, fallback para polling se falhar
    if (enableSSE) {
      connectSSE()
    } else {
      startFallbackPolling()
    }
  }, [externalId, enableSSE, fallbackInterval, maxFallbackChecks, connectSSE, startFallbackPolling, log])

  // Auto-start quando externalId for fornecido
  useEffect(() => {
    if (externalId && !paymentStatus?.payment_confirmed) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId, paymentStatus?.payment_confirmed, startMonitoring, stopMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    paymentStatus,
    isConnected,
    connectionType,
    error,
    fallbackCount,
    maxFallbackChecks,
    startMonitoring,
    stopMonitoring,
    // Computed properties
    isPaid: paymentStatus?.payment_confirmed || false,
    isDenied: paymentStatus?.status === "recusado" || paymentStatus?.status === "cancelado",
    isExpired: paymentStatus?.status === "vencido",
    redirectUrl: paymentStatus?.redirect_url,
    lastUpdate: paymentStatus?.last_update,
    // Performance stats
    isUsingSSE: connectionType === "sse",
    isUsingPolling: connectionType === "polling",
    dataSource: paymentStatus?.source,
  }
}
