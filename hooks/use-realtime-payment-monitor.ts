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
  is_refunded: boolean
  processed_at: string
  updated_at: string
  gateway: string
}

interface UseRealtimePaymentMonitorProps {
  externalId: string | null
  enabled?: boolean
  onPaymentConfirmed?: (status: PaymentStatus) => void
  onPaymentDenied?: (status: PaymentStatus) => void
  onPaymentExpired?: (status: PaymentStatus) => void
  onPaymentCanceled?: (status: PaymentStatus) => void
  onPaymentRefunded?: (status: PaymentStatus) => void
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
  onPaymentRefunded,
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
  const hasInitialCheckRef = useRef(false)

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[RealtimeMonitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  // APENAS UMA verificação inicial - SEM POLLING!
  const checkInitialStatusOnce = useCallback(async () => {
    if (!externalId || hasInitialCheckRef.current) return

    try {
      log("🔍 Verificação inicial única (sem polling)", { externalId })
      hasInitialCheckRef.current = true

      // Buscar diretamente no Supabase - SEM API externa
      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .in("gateway", ["superpay", "superpaybr"])
        .order("updated_at", { ascending: false })
        .limit(1)

      if (error && error.code !== "PGRST116") {
        log("❌ Erro na verificação inicial:", error)
        return
      }

      if (data && data.length > 0) {
        const status = data[0]
        setCurrentStatus(status)
        setError(null)
        log("✅ Status inicial encontrado no banco:", status)

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
        } else if (status.is_denied) {
          log("❌ Pagamento já negado no banco")
          onPaymentDenied?.(status)
        } else if (status.is_expired) {
          log("⏰ Pagamento já vencido no banco")
          onPaymentExpired?.(status)
        } else if (status.is_canceled) {
          log("🚫 Pagamento já cancelado no banco")
          onPaymentCanceled?.(status)
        } else if (status.is_refunded) {
          log("🔄 Pagamento já estornado no banco")
          onPaymentRefunded?.(status)
        }
      } else {
        log("⚠️ Nenhum status inicial encontrado - aguardando webhook")
      }
    } catch (error) {
      log("❌ Erro na verificação inicial:", error)
    }
  }, [
    externalId,
    log,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    autoRedirect,
    router,
  ])

  // Função para reconectar com backoff
  const reconnect = useCallback(() => {
    if (connectionAttempts >= 5) {
      log("❌ Máximo de tentativas de reconexão atingido")
      setError("Máximo de tentativas de conexão atingido")
      return
    }

    const backoffTime = Math.min(1000 * Math.pow(2, connectionAttempts), 30000) // Max 30s
    log(`🔄 Reconectando em ${backoffTime}ms... (${connectionAttempts + 1}/5)`)

    setTimeout(() => {
      setConnectionAttempts((prev) => prev + 1)
      setError(null)
      setIsConnecting(true)
    }, backoffTime)
  }, [log, connectionAttempts])

  // Configurar Realtime - APENAS para escutar webhooks
  useEffect(() => {
    if (!enabled || !externalId) {
      log("⏸️ Monitor desabilitado ou sem external_id")
      return
    }

    log("🚀 Iniciando monitor Realtime PURO (sem polling)", { externalId })
    setIsConnecting(true)
    setError(null)

    // Verificação inicial única
    checkInitialStatusOnce()

    // Configurar canal Realtime - APENAS para escutar webhooks
    const channelName = `payment_webhook_${externalId}_${Date.now()}`
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
          log("📡 WEBHOOK recebido via Realtime:", payload)
          setLastUpdate(new Date().toISOString())

          const newStatus = payload.new as PaymentStatus
          if (newStatus) {
            setCurrentStatus(newStatus)
            setError(null)
            log("📊 Status atualizado via WEBHOOK:", {
              external_id: newStatus.external_id,
              status_code: newStatus.status_code,
              status_title: newStatus.status_title,
              is_paid: newStatus.is_paid,
              is_denied: newStatus.is_denied,
              is_expired: newStatus.is_expired,
              is_canceled: newStatus.is_canceled,
              is_refunded: newStatus.is_refunded,
            })

            // Processar mudanças de status baseado no WEBHOOK
            if (newStatus.is_paid && !hasRedirectedRef.current) {
              log("🎉 PAGAMENTO CONFIRMADO via WEBHOOK!")
              onPaymentConfirmed?.(newStatus)

              if (autoRedirect) {
                hasRedirectedRef.current = true
                setTimeout(() => {
                  router.push("/upp/001")
                }, 2000)
              }
            } else if (newStatus.is_denied && !currentStatus?.is_denied) {
              log("❌ PAGAMENTO NEGADO via WEBHOOK")
              onPaymentDenied?.(newStatus)
            } else if (newStatus.is_expired && !currentStatus?.is_expired) {
              log("⏰ PAGAMENTO VENCIDO via WEBHOOK")
              onPaymentExpired?.(newStatus)
            } else if (newStatus.is_canceled && !currentStatus?.is_canceled) {
              log("🚫 PAGAMENTO CANCELADO via WEBHOOK")
              onPaymentCanceled?.(newStatus)
            } else if (newStatus.is_refunded && !currentStatus?.is_refunded) {
              log("🔄 PAGAMENTO ESTORNADO via WEBHOOK")
              onPaymentRefunded?.(newStatus)
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
          setConnectionAttempts(0) // Reset counter
          log("✅ Conectado ao Realtime - Aguardando webhooks da SuperPay!")
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
    checkInitialStatusOnce,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    autoRedirect,
    router,
    currentStatus,
  ])

  // Auto-reconexão limitada
  useEffect(() => {
    if (error && enabled && externalId && connectionAttempts < 5 && !isConnecting) {
      log(`Tentando reconexão automática... (${connectionAttempts}/5)`)
      const timeout = setTimeout(reconnect, 10000) // 10 segundos
      return () => clearTimeout(timeout)
    }
  }, [error, enabled, externalId, connectionAttempts, isConnecting, reconnect, log])

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
