"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

// Cliente Supabase para Realtime
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentStatus {
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  status_title: string
  amount: number
  payment_date: string | null
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  processed_at: string
}

interface UseRealtimePaymentMonitorProps {
  externalId: string
  onPaymentConfirmed?: (status: PaymentStatus) => void
  onPaymentDenied?: (status: PaymentStatus) => void
  onPaymentExpired?: (status: PaymentStatus) => void
  onPaymentCanceled?: (status: PaymentStatus) => void
  enabled?: boolean
  debug?: boolean
  autoRedirect?: boolean
}

export function useRealtimePaymentMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  enabled = true,
  debug = false,
  autoRedirect = true,
}: UseRealtimePaymentMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  const router = useRouter()

  const log = useCallback(
    (message: string, data?: any) => {
      if (debug) {
        console.log(`[Realtime Monitor] ${message}`, data || "")
      }
    },
    [debug],
  )

  // Verificação inicial única para pegar status atual (se existir)
  const checkInitialStatus = useCallback(async () => {
    if (!externalId || initialCheckDone) return

    try {
      log("Verificando status inicial...")

      const response = await fetch(`/api/superpaybr/payment-status?external_id=${encodeURIComponent(externalId)}`)
      const data = await response.json()

      if (data.success && data.found) {
        const currentStatus = data.data as PaymentStatus
        setStatus(currentStatus)
        log("Status inicial encontrado:", currentStatus)

        // Se já está pago, redirecionar imediatamente
        if (currentStatus.is_paid && autoRedirect) {
          log("Pagamento já confirmado, redirecionando...")
          router.push("/upp/001")
          return
        }
      } else {
        log("Nenhum status inicial encontrado, aguardando webhook...")
      }
    } catch (err) {
      log("Erro na verificação inicial:", err)
      setError(err instanceof Error ? err.message : "Erro na verificação inicial")
    } finally {
      setInitialCheckDone(true)
    }
  }, [externalId, initialCheckDone, log, router, autoRedirect])

  // Configurar Realtime subscription
  useEffect(() => {
    if (!enabled || !externalId) return

    log("Configurando monitoramento realtime para:", externalId)

    // Verificação inicial
    checkInitialStatus()

    // Configurar canal Realtime
    const channel = supabase
      .channel(`payment-${externalId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Escutar INSERT, UPDATE, DELETE
          schema: "public",
          table: "payment_webhooks",
          filter: `external_id=eq.${externalId}`,
        },
        (payload) => {
          log("Webhook realtime recebido:", payload)

          const newData = payload.new as any
          if (!newData) return

          const newStatus: PaymentStatus = {
            external_id: newData.external_id,
            invoice_id: newData.invoice_id,
            status_code: newData.status_code,
            status_name: newData.status_name,
            status_title: newData.status_title,
            amount: newData.amount,
            payment_date: newData.payment_date,
            is_paid: newData.is_paid,
            is_denied: newData.is_denied,
            is_expired: newData.is_expired,
            is_canceled: newData.is_canceled,
            is_refunded: newData.is_refunded,
            processed_at: newData.processed_at,
          }

          setStatus(newStatus)
          setError(null)

          log("Status atualizado via realtime:", {
            status_code: newStatus.status_code,
            is_paid: newStatus.is_paid,
            is_final: newStatus.is_paid || newStatus.is_denied || newStatus.is_expired || newStatus.is_canceled,
          })

          // Chamar callbacks apropriados
          if (newStatus.is_paid) {
            log("🎉 Pagamento confirmado via realtime!")

            // Salvar dados no localStorage
            localStorage.setItem(
              "payment_data",
              JSON.stringify({
                external_id: newStatus.external_id,
                amount: newStatus.amount,
                payment_date: newStatus.payment_date,
                status: "paid",
                confirmed_at: new Date().toISOString(),
              }),
            )

            if (onPaymentConfirmed) {
              onPaymentConfirmed(newStatus)
            }

            if (autoRedirect) {
              log("Redirecionando para /upp/001...")
              setTimeout(() => {
                router.push("/upp/001")
              }, 1000) // Pequeno delay para mostrar confirmação
            }
          } else if (newStatus.is_denied && onPaymentDenied) {
            log("❌ Pagamento negado via realtime")
            onPaymentDenied(newStatus)
          } else if (newStatus.is_expired && onPaymentExpired) {
            log("⏰ Pagamento vencido via realtime")
            onPaymentExpired(newStatus)
          } else if (newStatus.is_canceled && onPaymentCanceled) {
            log("🚫 Pagamento cancelado via realtime")
            onPaymentCanceled(newStatus)
          }
        },
      )
      .subscribe((status) => {
        log("Status da conexão realtime:", status)
        setIsConnected(status === "SUBSCRIBED")

        if (status === "CHANNEL_ERROR") {
          setError("Erro na conexão realtime")
        } else if (status === "TIMED_OUT") {
          setError("Timeout na conexão realtime")
        } else if (status === "CLOSED") {
          setError("Conexão realtime fechada")
        }
      })

    // Cleanup
    return () => {
      log("Removendo canal realtime")
      supabase.removeChannel(channel)
    }
  }, [
    enabled,
    externalId,
    checkInitialStatus,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    router,
    autoRedirect,
    log,
  ])

  // Função para reconectar manualmente
  const reconnect = useCallback(() => {
    log("Reconectando...")
    setError(null)
    setInitialCheckDone(false)
    // O useEffect será executado novamente
  }, [log])

  return {
    status,
    isConnected,
    error,
    reconnect,
    isReady: initialCheckDone,
  }
}
