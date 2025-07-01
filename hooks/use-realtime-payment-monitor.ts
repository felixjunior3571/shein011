"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentStatus {
  id: number
  external_id: string
  status_code: number
  status_name: string
  status_title: string
  status_description: string
  amount: number
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  processed_at: string
  updated_at: string
}

interface UseRealtimePaymentMonitorProps {
  externalId: string
  enabled?: boolean
  onPaymentConfirmed?: (status: PaymentStatus) => void
  onPaymentDenied?: (status: PaymentStatus) => void
  onPaymentExpired?: (status: PaymentStatus) => void
  onPaymentCanceled?: (status: PaymentStatus) => void
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
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const channelRef = useRef<any>(null)
  const hasRedirectedRef = useRef(false)

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[RealtimeMonitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  // Função para buscar status inicial
  const fetchInitialStatus = useCallback(async () => {
    if (!externalId) return

    try {
      log("🔍 Buscando status inicial...", { externalId })

      const response = await fetch("/api/superpaybr/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: externalId }),
      })

      const result = await response.json()

      if (result.success && result.data && result.data.length > 0) {
        const status = result.data[0]
        setCurrentStatus(status)
        log("✅ Status inicial carregado:", status)

        // Se já está pago, processar imediatamente
        if (status.is_paid && !hasRedirectedRef.current) {
          log("🎉 Pagamento já confirmado no banco!")
          onPaymentConfirmed?.(status)

          if (autoRedirect) {
            hasRedirectedRef.current = true
            setTimeout(() => {
              router.push("/upp/001")
            }, 2000)
          }
        }
      } else {
        log("⚠️ Nenhum status inicial encontrado")
      }
    } catch (error) {
      log("❌ Erro ao buscar status inicial:", error)
    }
  }, [externalId, log, onPaymentConfirmed, autoRedirect, router])

  // Função para reconectar
  const reconnect = useCallback(() => {
    log("🔄 Tentando reconectar...")
    setConnectionAttempts((prev) => prev + 1)
    setError(null)
    setIsConnecting(true)
  }, [log])

  // Configurar Realtime
  useEffect(() => {
    if (!enabled || !externalId) {
      log("⏸️ Monitor desabilitado ou sem external_id")
      return
    }

    log("🚀 Iniciando monitor Realtime...", { externalId })
    setIsConnecting(true)
    setError(null)

    // Buscar status inicial
    fetchInitialStatus()

    // Configurar canal Realtime
    const channel = supabase
      .channel(`payment_monitor_${externalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_webhooks",
          filter: `external_id=eq.${externalId}`,
        },
        (payload) => {
          log("📡 Evento Realtime recebido:", payload)
          setLastUpdate(new Date().toISOString())

          const newStatus = payload.new as PaymentStatus
          if (newStatus) {
            setCurrentStatus(newStatus)
            log("📊 Status atualizado:", newStatus)

            // Processar mudanças de status
            if (newStatus.is_paid && !hasRedirectedRef.current) {
              log("🎉 Pagamento confirmado via Realtime!")
              onPaymentConfirmed?.(newStatus)

              if (autoRedirect) {
                hasRedirectedRef.current = true
                setTimeout(() => {
                  router.push("/upp/001")
                }, 2000)
              }
            } else if (newStatus.is_denied) {
              log("❌ Pagamento negado via Realtime")
              onPaymentDenied?.(newStatus)
            } else if (newStatus.is_expired) {
              log("⏰ Pagamento vencido via Realtime")
              onPaymentExpired?.(newStatus)
            } else if (newStatus.is_canceled) {
              log("🚫 Pagamento cancelado via Realtime")
              onPaymentCanceled?.(newStatus)
            }
          }
        },
      )
      .subscribe((status) => {
        log("📡 Status da conexão Realtime:", status)

        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          setIsConnecting(false)
          setError(null)
          setIsReady(true)
          log("✅ Conectado ao Realtime!")
        } else if (status === "CHANNEL_ERROR") {
          setIsConnected(false)
          setIsConnecting(false)
          setError("Erro na conexão Realtime")
          log("❌ Erro na conexão Realtime")
        } else if (status === "TIMED_OUT") {
          setIsConnected(false)
          setIsConnecting(false)
          setError("Timeout na conexão Realtime")
          log("⏰ Timeout na conexão Realtime")
        } else if (status === "CLOSED") {
          setIsConnected(false)
          setIsConnecting(false)
          log("🔌 Conexão Realtime fechada")
        }
      })

    channelRef.current = channel

    // Cleanup
    return () => {
      log("🧹 Limpando conexão Realtime...")
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [
    enabled,
    externalId,
    log,
    fetchInitialStatus,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    autoRedirect,
    router,
    connectionAttempts,
  ])

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
