"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentWebhook {
  id: number
  external_id: string
  gateway: string
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
  customer_id: string
  processed_at: string
  updated_at: string
}

interface UseStableRealtimeMonitorProps {
  externalId: string | null
  enabled?: boolean
  onPaymentConfirmed?: (payment: PaymentWebhook) => void
  onPaymentDenied?: (payment: PaymentWebhook) => void
  onPaymentExpired?: (payment: PaymentWebhook) => void
  onPaymentCanceled?: (payment: PaymentWebhook) => void
  debug?: boolean
  autoRedirect?: boolean
}

export function useStableRealtimeMonitor({
  externalId,
  enabled = true,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  debug = false,
  autoRedirect = true,
}: UseStableRealtimeMonitorProps) {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState<PaymentWebhook | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [isReady, setIsReady] = useState(false)

  // Refs para controle de estado
  const channelRef = useRef<any>(null)
  const hasRedirectedRef = useRef(false)
  const hasInitialCheckRef = useRef(false)
  const isUnmountedRef = useRef(false)
  const isConnectedRef = useRef(false)

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[StableRealtimeMonitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  // Verificação inicial única (SEM POLLING)
  const checkInitialStatus = useCallback(async () => {
    if (!externalId || hasInitialCheckRef.current || isUnmountedRef.current) return

    try {
      log("🔍 Verificação inicial única", { externalId })
      hasInitialCheckRef.current = true

      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .order("updated_at", { ascending: false })
        .limit(1)

      if (error && error.code !== "PGRST116") {
        log("❌ Erro na verificação inicial:", error)
        setError(error.message)
        return
      }

      if (data && data.length > 0) {
        const webhook = data[0] as PaymentWebhook
        setCurrentStatus(webhook)
        setError(null)
        log("✅ Status inicial encontrado:", webhook)

        // Processar status inicial
        if (webhook.is_paid && !hasRedirectedRef.current) {
          log("🎉 Pagamento já confirmado no banco!")
          onPaymentConfirmed?.(webhook)

          if (autoRedirect) {
            hasRedirectedRef.current = true
            log("🚀 Redirecionando para ativação do cartão...")
            setTimeout(() => {
              if (!isUnmountedRef.current) {
                router.push("/upp/001")
              }
            }, 2000)
          }
        } else if (webhook.is_denied) {
          log("❌ Pagamento já negado no banco")
          onPaymentDenied?.(webhook)
        } else if (webhook.is_expired) {
          log("⏰ Pagamento já vencido no banco")
          onPaymentExpired?.(webhook)
        } else if (webhook.is_canceled) {
          log("🚫 Pagamento já cancelado no banco")
          onPaymentCanceled?.(webhook)
        }
      } else {
        log("⚠️ Nenhum status inicial encontrado - aguardando webhook")
        setCurrentStatus(null)
      }
    } catch (error) {
      log("❌ Erro na verificação inicial:", error)
      if (!isUnmountedRef.current) {
        setError(error instanceof Error ? error.message : "Erro desconhecido")
      }
    }
  }, [externalId, log, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, onPaymentCanceled, autoRedirect, router])

  // Função para limpar conexão
  const cleanupConnection = useCallback(() => {
    if (channelRef.current) {
      log("🧹 Limpando conexão Realtime...")
      try {
        supabase.removeChannel(channelRef.current)
      } catch (error) {
        log("⚠️ Erro ao limpar canal:", error)
      }
      channelRef.current = null
    }

    isConnectedRef.current = false
    setIsConnected(false)
    setIsConnecting(false)
  }, [log])

  // Função para conectar ao Realtime (ÚNICA VEZ)
  const connectToRealtime = useCallback(() => {
    if (!enabled || !externalId || isUnmountedRef.current || isConnectedRef.current) {
      return
    }

    log("🚀 Conectando ao Realtime AUTENTICADO", { externalId })
    setIsConnecting(true)
    setError(null)

    const channelName = `authenticated_payment_${externalId}`
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: externalId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_webhooks",
          filter: `external_id=eq.${externalId}`,
        },
        (payload) => {
          if (isUnmountedRef.current) return

          log("📡 WEBHOOK recebido via Realtime:", payload)
          setLastUpdate(new Date().toISOString())

          const newWebhook = payload.new as PaymentWebhook
          if (newWebhook) {
            setCurrentStatus(newWebhook)
            setError(null)

            log("📊 Status atualizado via WEBHOOK:", {
              external_id: newWebhook.external_id,
              status_code: newWebhook.status_code,
              status_title: newWebhook.status_title,
              is_paid: newWebhook.is_paid,
            })

            // Processar mudanças de status
            if (newWebhook.is_paid && !hasRedirectedRef.current) {
              log("🎉 PAGAMENTO CONFIRMADO via WEBHOOK!")
              onPaymentConfirmed?.(newWebhook)

              if (autoRedirect) {
                hasRedirectedRef.current = true
                log("🚀 Redirecionando para ativação do cartão...")
                setTimeout(() => {
                  if (!isUnmountedRef.current) {
                    router.push("/upp/001")
                  }
                }, 2000)
              }
            } else if (newWebhook.is_denied && !currentStatus?.is_denied) {
              log("❌ PAGAMENTO NEGADO via WEBHOOK")
              onPaymentDenied?.(newWebhook)
            } else if (newWebhook.is_expired && !currentStatus?.is_expired) {
              log("⏰ PAGAMENTO VENCIDO via WEBHOOK")
              onPaymentExpired?.(newWebhook)
            } else if (newWebhook.is_canceled && !currentStatus?.is_canceled) {
              log("🚫 PAGAMENTO CANCELADO via WEBHOOK")
              onPaymentCanceled?.(newWebhook)
            }
          }
        },
      )
      .subscribe((status) => {
        if (isUnmountedRef.current) return

        log("📡 Status da conexão Realtime:", status)

        if (status === "SUBSCRIBED") {
          isConnectedRef.current = true
          setIsConnected(true)
          setIsConnecting(false)
          setError(null)
          setIsReady(true)
          setConnectionAttempts(0)
          log("✅ Conectado ao Realtime AUTENTICADO - Aguardando webhooks da SuperPay!")
        } else if (status === "CHANNEL_ERROR") {
          log("❌ Erro na conexão Realtime")
          setError("Erro na conexão Realtime")
        } else if (status === "TIMED_OUT") {
          log("⏰ Timeout na conexão Realtime")
          setError("Timeout na conexão Realtime")
        } else if (status === "CLOSED") {
          log("🔌 Conexão Realtime fechada")
          isConnectedRef.current = false
          setIsConnected(false)
        }
      })

    channelRef.current = channel
  }, [
    enabled,
    externalId,
    log,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    autoRedirect,
    router,
    currentStatus,
  ])

  // Função para reconectar manualmente
  const reconnect = useCallback(() => {
    if (connectionAttempts >= 3) {
      log("❌ Máximo de tentativas de reconexão atingido")
      setError("Máximo de tentativas de conexão atingido")
      return
    }

    log("🔄 Reconectando manualmente...")
    cleanupConnection()
    setConnectionAttempts((prev) => prev + 1)

    setTimeout(() => {
      if (!isUnmountedRef.current) {
        connectToRealtime()
      }
    }, 2000)
  }, [log, connectionAttempts, cleanupConnection, connectToRealtime])

  // Effect principal (EXECUTADO APENAS UMA VEZ)
  useEffect(() => {
    isUnmountedRef.current = false

    if (!enabled || !externalId) {
      log("⏸️ Monitor desabilitado ou sem external_id")
      return
    }

    // Verificação inicial
    checkInitialStatus()

    // Conectar ao Realtime (apenas uma vez)
    connectToRealtime()

    // Cleanup
    return () => {
      isUnmountedRef.current = true
      cleanupConnection()
    }
  }, [enabled, externalId]) // Dependências mínimas para evitar re-execução

  return {
    currentStatus,
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    connectionAttempts,
    isReady,
    reconnect,
    // Computed properties
    isPaid: currentStatus?.is_paid || false,
    isDenied: currentStatus?.is_denied || false,
    isExpired: currentStatus?.is_expired || false,
    isCanceled: currentStatus?.is_canceled || false,
    statusName: currentStatus?.status_title || "Aguardando confirmação...",
  }
}
