"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

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
  processed_at: string
}

interface UseRealtimePaymentMonitorProps {
  externalId: string
  enabled?: boolean
  onPaymentConfirmed?: (payment: PaymentStatus) => void
  onPaymentDenied?: (payment: PaymentStatus) => void
  onPaymentExpired?: (payment: PaymentStatus) => void
  onPaymentCanceled?: (payment: PaymentStatus) => void
  onStatusChange?: (payment: PaymentStatus) => void
}

interface RealtimeMonitorState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  lastUpdate: string | null
  currentStatus: PaymentStatus | null
  connectionAttempts: number
}

export function useRealtimePaymentMonitor({
  externalId,
  enabled = true,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onStatusChange,
}: UseRealtimePaymentMonitorProps) {
  const [state, setState] = useState<RealtimeMonitorState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastUpdate: null,
    currentStatus: null,
    connectionAttempts: 0,
  })

  // Refs para evitar loops infinitos
  const channelRef = useRef<any>(null)
  const isSubscribedRef = useRef(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitialCheckRef = useRef(false)

  // Função para fazer verificação inicial
  const performInitialCheck = useCallback(async () => {
    if (!externalId || hasInitialCheckRef.current) return

    try {
      console.log(`🔍 [Realtime Monitor] Verificação inicial para: ${externalId}`)
      hasInitialCheckRef.current = true

      const { data, error } = await supabase.from("payment_webhooks").select("*").eq("external_id", externalId).single()

      if (error && error.code !== "PGRST116") {
        console.log(`❌ [Realtime Monitor] Erro na verificação inicial:`, error)
        return
      }

      if (data) {
        console.log(`✅ [Realtime Monitor] Status encontrado:`, data)
        const payment: PaymentStatus = {
          external_id: data.external_id,
          status_code: data.status_code,
          status_name: data.status_name,
          status_title: data.status_title,
          amount: data.amount,
          is_paid: data.is_paid,
          is_denied: data.is_denied,
          is_expired: data.is_expired,
          is_canceled: data.is_canceled,
          is_refunded: data.is_refunded,
          processed_at: data.processed_at,
        }

        setState((prev) => ({
          ...prev,
          currentStatus: payment,
          lastUpdate: new Date().toISOString(),
        }))

        // Chamar callbacks apropriados
        onStatusChange?.(payment)

        if (payment.is_paid) {
          console.log(`🎉 [Realtime Monitor] Pagamento já confirmado!`)
          onPaymentConfirmed?.(payment)
        } else if (payment.is_denied) {
          console.log(`❌ [Realtime Monitor] Pagamento já negado!`)
          onPaymentDenied?.(payment)
        } else if (payment.is_expired) {
          console.log(`⏰ [Realtime Monitor] Pagamento já vencido!`)
          onPaymentExpired?.(payment)
        } else if (payment.is_canceled) {
          console.log(`🚫 [Realtime Monitor] Pagamento já cancelado!`)
          onPaymentCanceled?.(payment)
        }
      } else {
        console.log(`📋 [Realtime Monitor] Nenhum status encontrado ainda para: ${externalId}`)
      }
    } catch (error) {
      console.log(`❌ [Realtime Monitor] Erro na verificação inicial:`, error)
    }
  }, [externalId, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, onPaymentCanceled, onStatusChange])

  // Função para conectar ao Realtime
  const connectRealtime = useCallback(() => {
    if (!externalId || !enabled || isSubscribedRef.current) return

    console.log(`🔌 [Realtime Monitor] Conectando ao Realtime para: ${externalId}`)

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
      connectionAttempts: prev.connectionAttempts + 1,
    }))

    // Criar canal único
    const channelName = `payment-status-${externalId}-${Date.now()}`
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
          console.log(`📡 [Realtime Monitor] Mudança detectada:`, payload)

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const data = payload.new
            const payment: PaymentStatus = {
              external_id: data.external_id,
              status_code: data.status_code,
              status_name: data.status_name,
              status_title: data.status_title,
              amount: data.amount,
              is_paid: data.is_paid,
              is_denied: data.is_denied,
              is_expired: data.is_expired,
              is_canceled: data.is_canceled,
              is_refunded: data.is_refunded,
              processed_at: data.processed_at,
            }

            setState((prev) => ({
              ...prev,
              currentStatus: payment,
              lastUpdate: new Date().toISOString(),
            }))

            // Chamar callbacks
            onStatusChange?.(payment)

            if (payment.is_paid) {
              console.log(`🎉 [Realtime Monitor] PAGAMENTO CONFIRMADO via Realtime!`)
              onPaymentConfirmed?.(payment)
            } else if (payment.is_denied) {
              console.log(`❌ [Realtime Monitor] PAGAMENTO NEGADO via Realtime!`)
              onPaymentDenied?.(payment)
            } else if (payment.is_expired) {
              console.log(`⏰ [Realtime Monitor] PAGAMENTO VENCIDO via Realtime!`)
              onPaymentExpired?.(payment)
            } else if (payment.is_canceled) {
              console.log(`🚫 [Realtime Monitor] PAGAMENTO CANCELADO via Realtime!`)
              onPaymentCanceled?.(payment)
            }
          }
        },
      )
      .subscribe((status) => {
        console.log(`📊 [Realtime Monitor] Status da conexão:`, status)

        if (status === "SUBSCRIBED") {
          console.log(`✅ [Realtime Monitor] Conectado com sucesso ao Realtime`)
          isSubscribedRef.current = true
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            error: null,
          }))
        } else if (status === "CHANNEL_ERROR") {
          console.log(`❌ [Realtime Monitor] Erro no canal Realtime`)
          isSubscribedRef.current = false
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            error: "Erro na conexão Realtime",
          }))
        } else if (status === "TIMED_OUT") {
          console.log(`⏰ [Realtime Monitor] Timeout na conexão Realtime`)
          isSubscribedRef.current = false
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            error: "Timeout na conexão",
          }))
        } else if (status === "CLOSED") {
          console.log(`🔌 [Realtime Monitor] Conexão Realtime fechada`)
          isSubscribedRef.current = false
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
          }))

          // Tentar reconectar após 5 segundos se ainda estiver habilitado
          if (enabled && !reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`🔄 [Realtime Monitor] Tentando reconectar...`)
              reconnectTimeoutRef.current = null
              connectRealtime()
            }, 5000)
          }
        }
      })

    channelRef.current = channel
  }, [externalId, enabled, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, onPaymentCanceled, onStatusChange])

  // Função para desconectar
  const disconnect = useCallback(() => {
    console.log(`🔌 [Realtime Monitor] Desconectando...`)

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    isSubscribedRef.current = false
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
    }))
  }, [])

  // Função para reconectar manualmente
  const reconnect = useCallback(() => {
    console.log(`🔄 [Realtime Monitor] Reconexão manual solicitada`)
    disconnect()
    setTimeout(() => {
      connectRealtime()
    }, 1000)
  }, [disconnect, connectRealtime])

  // Effect principal
  useEffect(() => {
    if (!externalId || !enabled) {
      disconnect()
      return
    }

    console.log(`🚀 [Realtime Monitor] Iniciando monitoramento para: ${externalId}`)

    // Fazer verificação inicial
    performInitialCheck()

    // Conectar ao Realtime
    connectRealtime()

    // Cleanup
    return () => {
      console.log(`🧹 [Realtime Monitor] Limpando recursos...`)
      disconnect()
      hasInitialCheckRef.current = false
    }
  }, [externalId, enabled]) // Dependências mínimas

  return {
    ...state,
    reconnect,
    disconnect,
  }
}
