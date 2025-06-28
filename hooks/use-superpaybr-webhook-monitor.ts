"use client"

import { useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentData {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  statusTitle: string
  amount: number
  paymentDate: string
  provider: string
  processedAt: string
  externalId: string
}

interface UseWebhookMonitorOptions {
  externalId: string
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
  onStatusUpdate?: (data: PaymentData) => void
  enabled?: boolean
  checkInterval?: number
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  onStatusUpdate,
  enabled = true,
  checkInterval = 2000, // 2 segundos
}: UseWebhookMonitorOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastStatusRef = useRef<string>("")
  const callbackExecutedRef = useRef<boolean>(false)

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId || !enabled) return

    try {
      // 1. Verificar localStorage primeiro (mais rápido)
      const localStorageKey = `webhook_payment_${externalId}`
      const localData = localStorage.getItem(localStorageKey)

      if (localData) {
        const paymentData: PaymentData = JSON.parse(localData)

        // Verificar se o status mudou
        if (paymentData.statusName !== lastStatusRef.current) {
          console.log(`🔄 Status atualizado via localStorage: ${paymentData.statusName}`)
          lastStatusRef.current = paymentData.statusName

          // Executar callback apropriado apenas uma vez
          if (!callbackExecutedRef.current) {
            if (paymentData.isPaid && onPaymentConfirmed) {
              console.log("🎉 Pagamento confirmado via localStorage!")
              onPaymentConfirmed(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isDenied && onPaymentDenied) {
              console.log("❌ Pagamento negado via localStorage!")
              onPaymentDenied(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isExpired && onPaymentExpired) {
              console.log("⏰ Pagamento vencido via localStorage!")
              onPaymentExpired(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isCanceled && onPaymentCanceled) {
              console.log("🚫 Pagamento cancelado via localStorage!")
              onPaymentCanceled(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isRefunded && onPaymentRefunded) {
              console.log("↩️ Pagamento estornado via localStorage!")
              onPaymentRefunded(paymentData)
              callbackExecutedRef.current = true
            }
          }

          // Sempre executar callback de status update
          if (onStatusUpdate) {
            onStatusUpdate(paymentData)
          }
        }

        return
      }

      // 2. Se não encontrou no localStorage, verificar Supabase (fallback)
      const { data: webhookData, error } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .eq("provider", "superpaybr")
        .order("processed_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // Não logar erro se for apenas "not found"
        if (error.code !== "PGRST116") {
          console.log("⚠️ Erro ao consultar webhook no Supabase:", error.message)
        }
        return
      }

      if (webhookData) {
        const paymentData: PaymentData = {
          isPaid: webhookData.is_paid,
          isDenied: webhookData.is_denied,
          isRefunded: webhookData.is_refunded,
          isExpired: webhookData.is_expired,
          isCanceled: webhookData.is_canceled,
          statusCode: webhookData.status_code,
          statusName: webhookData.status_name,
          statusTitle: webhookData.status_title,
          amount: webhookData.amount,
          paymentDate: webhookData.payment_date || webhookData.processed_at,
          provider: webhookData.provider,
          processedAt: webhookData.processed_at,
          externalId: webhookData.external_id,
        }

        // Salvar no localStorage para próximas verificações
        localStorage.setItem(localStorageKey, JSON.stringify(paymentData))

        // Verificar se o status mudou
        if (paymentData.statusName !== lastStatusRef.current) {
          console.log(`🔄 Status atualizado via Supabase: ${paymentData.statusName}`)
          lastStatusRef.current = paymentData.statusName

          // Executar callback apropriado apenas uma vez
          if (!callbackExecutedRef.current) {
            if (paymentData.isPaid && onPaymentConfirmed) {
              console.log("🎉 Pagamento confirmado via Supabase!")
              onPaymentConfirmed(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isDenied && onPaymentDenied) {
              console.log("❌ Pagamento negado via Supabase!")
              onPaymentDenied(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isExpired && onPaymentExpired) {
              console.log("⏰ Pagamento vencido via Supabase!")
              onPaymentExpired(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isCanceled && onPaymentCanceled) {
              console.log("🚫 Pagamento cancelado via Supabase!")
              onPaymentCanceled(paymentData)
              callbackExecutedRef.current = true
            } else if (paymentData.isRefunded && onPaymentRefunded) {
              console.log("↩️ Pagamento estornado via Supabase!")
              onPaymentRefunded(paymentData)
              callbackExecutedRef.current = true
            }
          }

          // Sempre executar callback de status update
          if (onStatusUpdate) {
            onStatusUpdate(paymentData)
          }
        }
      }
    } catch (error) {
      console.log("❌ Erro ao verificar status do pagamento:", error)
    }
  }, [
    externalId,
    enabled,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
    onStatusUpdate,
  ])

  useEffect(() => {
    if (!enabled || !externalId) {
      return
    }

    console.log(`🔍 Iniciando monitoramento SuperPayBR para: ${externalId}`)

    // Verificação inicial
    checkPaymentStatus()

    // Configurar intervalo de verificação
    intervalRef.current = setInterval(checkPaymentStatus, checkInterval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      console.log(`🛑 Monitoramento SuperPayBR parado para: ${externalId}`)
    }
  }, [externalId, enabled, checkInterval, checkPaymentStatus])

  // Função para parar o monitoramento manualmente
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      console.log(`🛑 Monitoramento SuperPayBR parado manualmente para: ${externalId}`)
    }
  }, [externalId])

  // Função para verificar status manualmente
  const checkNow = useCallback(() => {
    checkPaymentStatus()
  }, [checkPaymentStatus])

  return {
    stopMonitoring,
    checkNow,
    isMonitoring: !!intervalRef.current,
  }
}
