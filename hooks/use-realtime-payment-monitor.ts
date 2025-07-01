"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentStatus {
  external_id: string
  status_code: number
  status_name: string
  status_title: string
  amount: number
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  payment_date?: string
  processed_at: string
  updated_at: string
}

interface UseRealtimePaymentMonitorProps {
  externalId: string | null
  enabled?: boolean
  onPaymentConfirmed?: (payment: PaymentStatus) => void
  onPaymentDenied?: (payment: PaymentStatus) => void
  onPaymentExpired?: (payment: PaymentStatus) => void
  onPaymentCanceled?: (payment: PaymentStatus) => void
  debug?: boolean
  autoRedirect?: boolean
}

export function useRealtimePaymentMonitor({
  externalId,
  enabled = true,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  debug = false,
  autoRedirect = false,
}: UseRealtimePaymentMonitorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const channelRef = useRef<any>(null)
  const router = useRouter()
  const hasInitialCheckRef = useRef(false)

  // Log debug
  const debugLog = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`🔄 [Realtime Monitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  // Verificação inicial do status
  const checkInitialStatus = useCallback(async () => {
    if (!externalId || hasInitialCheckRef.current) return

    try {
      debugLog("Verificando status inicial", { externalId })

      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .eq("gateway", "superpaybr")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        debugLog("Erro na verificação inicial", error)
        return
      }

      if (data) {
        debugLog("Status inicial encontrado", data)
        setCurrentStatus(data)
        setLastUpdate(new Date().toISOString())

        // Processar status inicial
        if (data.is_paid) {
          debugLog("Pagamento já confirmado!")
          onPaymentConfirmed?.(data)
          if (autoRedirect) {
            setTimeout(() => router.push("/upp/001"), 1000)
          }
        } else if (data.is_denied) {
          debugLog("Pagamento já negado!")
          onPaymentDenied?.(data)
        } else if (data.is_expired) {
          debugLog("Pagamento já vencido!")
          onPaymentExpired?.(data)
        } else if (data.is_canceled) {
          debugLog("Pagamento já cancelado!")
          onPaymentCanceled?.(data)
        }
      } else {
        debugLog("Nenhum status inicial encontrado")
      }

      hasInitialCheckRef.current = true
    } catch (error) {
      debugLog("Erro na verificação inicial", error)
    }
  }, [
    externalId,
    debugLog,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    autoRedirect,
    router,
  ])

  // Conectar ao Realtime
  const connect = useCallback(() => {
    if (!externalId || !enabled || channelRef.current) return

    debugLog("Iniciando conexão Realtime", { externalId })
    setIsConnecting(true)
    setError(null)
    setConnectionAttempts((prev) => prev + 1)

    const channelName = `payment-status-${externalId}`
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_webhooks",
          filter: `external_id=eq.${externalId}`,
        },
        (payload) => {
          debugLog("Webhook recebido via Realtime", payload)

          const newData = payload.new as PaymentStatus
          if (!newData) return

          setCurrentStatus(newData)
          setLastUpdate(new Date().toISOString())

          // Processar mudanças de status
          if (newData.is_paid && !currentStatus?.is_paid) {
            debugLog("🎉 Pagamento confirmado via Realtime!")
            onPaymentConfirmed?.(newData)
            if (autoRedirect) {
              setTimeout(() => router.push("/upp/001"), 2000)
            }
          } else if (newData.is_denied && !currentStatus?.is_denied) {
            debugLog("❌ Pagamento negado via Realtime!")
            onPaymentDenied?.(newData)
          } else if (newData.is_expired && !currentStatus?.is_expired) {
            debugLog("⏰ Pagamento vencido via Realtime!")
            onPaymentExpired?.(newData)
          } else if (newData.is_canceled && !currentStatus?.is_canceled) {
            debugLog("🚫 Pagamento cancelado via Realtime!")
            onPaymentCanceled?.(newData)
          }
        },
      )
      .subscribe((status) => {
        debugLog("Status da conexão Realtime", status)

        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          setIsConnecting(false)
          setError(null)
          setIsReady(true)
          debugLog("✅ Conectado ao Realtime com sucesso!")
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false)
          setIsConnecting(false)
          setError("Erro na conexão Realtime")
          debugLog("❌ Erro na conexão Realtime")
        } else if (status === "TIMED_OUT") {
          setIsConnected(false)
          setIsConnecting(false)
          setError("Timeout na conexão Realtime")
          debugLog("⏰ Timeout na conexão Realtime")
        } else if (status === "CLOSED") {
          setIsConnected(false)
          setIsConnecting(false)
          setError("Conexão Realtime fechada")
          debugLog("🔌 Conexão Realtime fechada")
        }
      })

    channelRef.current = channel
  }, [
    externalId,
    enabled,
    debugLog,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    autoRedirect,
    router,
    currentStatus,
  ])

  // Desconectar
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      debugLog("Desconectando do Realtime")
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsConnected(false)
      setIsConnecting(false)
      setIsReady(false)
    }
  }, [debugLog])

  // Reconectar
  const reconnect = useCallback(() => {
    debugLog("Reconectando...")
    disconnect()
    setTimeout(() => {
      connect()
    }, 1000)
  }, [debugLog, disconnect, connect])

  // Efeito principal
  useEffect(() => {
    if (!externalId || !enabled) {
      debugLog("Monitor desabilitado", { externalId, enabled })
      return
    }

    debugLog("Iniciando monitor Realtime", { externalId })

    // Verificar status inicial primeiro
    checkInitialStatus()

    // Conectar ao Realtime
    connect()

    // Cleanup
    return () => {
      debugLog("Limpando monitor Realtime")
      disconnect()
    }
  }, [externalId, enabled, debugLog, checkInitialStatus, connect, disconnect])

  return {
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    currentStatus,
    connectionAttempts,
    isReady,
    reconnect,
  }
}
