"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

// Cliente Supabase para o frontend
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentStatus {
  id: number
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  status_title: string
  status_description?: string
  amount: number
  payment_date?: string
  payment_gateway?: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  gateway: string
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
  redirectUrl?: string
}

export function useRealtimePaymentMonitor({
  externalId,
  enabled = true,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  debug = false,
  autoRedirect = true,
  redirectUrl = "/upp/001",
}: UseRealtimePaymentMonitorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [isReady, setIsReady] = useState(false)

  const router = useRouter()
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasRedirectedRef = useRef(false)

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[Realtime Monitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  // Função para verificar status inicial
  const checkInitialStatus = useCallback(async () => {
    if (!externalId || !enabled) return

    try {
      log(`🔍 Verificando status inicial para: ${externalId}`)

      const { data, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .eq("gateway", "superpaybr")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 = No rows found, que é normal
        log(`❌ Erro ao verificar status inicial:`, error)
        setError(`Erro ao verificar status: ${error.message}`)
        return
      }

      if (data) {
        log(`✅ Status inicial encontrado:`, data)
        setCurrentStatus(data)
        setLastUpdate(new Date().toISOString())

        // Verificar se já está pago
        if (data.is_paid && !hasRedirectedRef.current) {
          log(`🎉 Pagamento já confirmado! Executando callback...`)
          onPaymentConfirmed?.(data)

          if (autoRedirect) {
            hasRedirectedRef.current = true
            log(`🚀 Redirecionando para: ${redirectUrl}`)
            router.push(redirectUrl)
          }
        } else if (data.is_denied) {
          log(`❌ Pagamento negado`)
          onPaymentDenied?.(data)
        } else if (data.is_expired) {
          log(`⏰ Pagamento vencido`)
          onPaymentExpired?.(data)
        } else if (data.is_canceled) {
          log(`🚫 Pagamento cancelado`)
          onPaymentCanceled?.(data)
        }
      } else {
        log(`ℹ️ Nenhum status encontrado ainda para: ${externalId}`)
      }
    } catch (error) {
      log(`❌ Erro na verificação inicial:`, error)
      setError(`Erro na verificação: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }, [
    externalId,
    enabled,
    log,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    autoRedirect,
    redirectUrl,
    router,
  ])

  // Função para conectar ao Realtime
  const connect = useCallback(() => {
    if (!externalId || !enabled || channelRef.current) {
      return
    }

    setIsConnecting(true)
    setConnectionAttempts((prev) => prev + 1)
    log(`🔄 Tentativa de conexão #${connectionAttempts + 1} para: ${externalId}`)

    try {
      // Criar canal único para este external_id
      const channelName = `payment_monitor_${externalId}_${Date.now()}`

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*", // Escutar INSERT, UPDATE, DELETE
            schema: "public",
            table: "payment_webhooks",
            filter: `external_id=eq.${externalId}`,
          },
          (payload) => {
            log(`📡 Evento Realtime recebido:`, payload)

            const newData = payload.new as PaymentStatus
            const eventType = payload.eventType

            if (newData && newData.external_id === externalId) {
              log(`✅ Dados atualizados via Realtime (${eventType}):`, newData)

              setCurrentStatus(newData)
              setLastUpdate(new Date().toISOString())
              setError(null)

              // Executar callbacks baseados no status
              if (newData.is_paid && !hasRedirectedRef.current) {
                log(`🎉 PAGAMENTO CONFIRMADO VIA REALTIME!`)
                onPaymentConfirmed?.(newData)

                if (autoRedirect) {
                  hasRedirectedRef.current = true
                  log(`🚀 Redirecionando para: ${redirectUrl}`)
                  setTimeout(() => {
                    router.push(redirectUrl)
                  }, 1000) // Delay de 1 segundo para mostrar a confirmação
                }
              } else if (newData.is_denied) {
                log(`❌ PAGAMENTO NEGADO VIA REALTIME`)
                onPaymentDenied?.(newData)
              } else if (newData.is_expired) {
                log(`⏰ PAGAMENTO VENCIDO VIA REALTIME`)
                onPaymentExpired?.(newData)
              } else if (newData.is_canceled) {
                log(`🚫 PAGAMENTO CANCELADO VIA REALTIME`)
                onPaymentCanceled?.(newData)
              }
            }
          },
        )
        .subscribe((status) => {
          log(`📡 Status da subscrição Realtime:`, status)

          if (status === "SUBSCRIBED") {
            setIsConnected(true)
            setIsConnecting(false)
            setError(null)
            setIsReady(true)
            log(`✅ Conectado ao Realtime com sucesso!`)

            // Verificar status inicial após conectar
            checkInitialStatus()
          } else if (status === "CHANNEL_ERROR") {
            setIsConnected(false)
            setIsConnecting(false)
            setError("Erro na conexão Realtime")
            log(`❌ Erro na conexão Realtime`)
          } else if (status === "TIMED_OUT") {
            setIsConnected(false)
            setIsConnecting(false)
            setError("Timeout na conexão Realtime")
            log(`⏰ Timeout na conexão Realtime`)
          } else if (status === "CLOSED") {
            setIsConnected(false)
            setIsConnecting(false)
            log(`🔌 Conexão Realtime fechada`)
          }
        })

      channelRef.current = channel
      log(`📡 Canal Realtime criado: ${channelName}`)
    } catch (error) {
      log(`❌ Erro ao criar conexão Realtime:`, error)
      setIsConnecting(false)
      setError(`Erro de conexão: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }, [
    externalId,
    enabled,
    connectionAttempts,
    log,
    checkInitialStatus,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    autoRedirect,
    redirectUrl,
    router,
  ])

  // Função para desconectar
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      log(`🔌 Desconectando do Realtime...`)
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setIsReady(false)
  }, [log])

  // Função para reconectar
  const reconnect = useCallback(() => {
    log(`🔄 Iniciando reconexão...`)
    disconnect()

    // Aguardar um pouco antes de reconectar
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, 2000)
  }, [log, disconnect, connect])

  // Efeito principal para gerenciar a conexão
  useEffect(() => {
    if (externalId && enabled) {
      log(`🚀 Iniciando monitor Realtime para: ${externalId}`)
      connect()
    } else {
      log(`⏹️ Monitor desabilitado ou sem external_id`)
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [externalId, enabled, connect, disconnect, log])

  // Efeito para reconexão automática em caso de erro
  useEffect(() => {
    if (error && enabled && externalId && connectionAttempts < 5) {
      log(`🔄 Tentando reconexão automática em 5 segundos... (tentativa ${connectionAttempts}/5)`)

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnect()
      }, 5000)
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [error, enabled, externalId, connectionAttempts, reconnect, log])

  return {
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    currentStatus,
    connectionAttempts,
    isReady,
    reconnect,
    disconnect,
  }
}
