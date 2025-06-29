"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentData {
  externalId: string
  invoiceId: string
  amount: number
  statusCode: number
  statusName: string
  statusTitle: string
  paymentDate: string
  provider: string
  processedAt: string
}

interface WebhookMonitorOptions {
  externalId: string | null
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentData) => void
  onPaymentDenied?: (data: PaymentData) => void
  onPaymentExpired?: (data: PaymentData) => void
  onPaymentCanceled?: (data: PaymentData) => void
  onPaymentRefunded?: (data: PaymentData) => void
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<string>("waiting")
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackExecutedRef = useRef<boolean>(false)

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPayBR Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  const checkPaymentStatus = useCallback(async () => {
    if (!externalId) {
      log("External ID não fornecido")
      return
    }

    try {
      setLastCheck(new Date())
      log(`Verificando status do pagamento: ${externalId}`)

      // Buscar no Supabase primeiro (dados do webhook)
      const { data: webhookData, error: supabaseError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .eq("provider", "superpaybr")
        .order("processed_at", { ascending: false })
        .limit(1)
        .single()

      if (webhookData && !supabaseError) {
        log("Status encontrado no Supabase:", webhookData)

        const paymentInfo: PaymentData = {
          externalId: webhookData.external_id,
          invoiceId: webhookData.invoice_id,
          amount: webhookData.amount,
          statusCode: webhookData.status_code,
          statusName: webhookData.status_name,
          statusTitle: webhookData.status_title,
          paymentDate: webhookData.payment_date,
          provider: "superpaybr",
          processedAt: webhookData.processed_at,
        }

        setPaymentData(paymentInfo)

        // Verificar status e executar callbacks
        if (webhookData.is_paid && !callbackExecutedRef.current) {
          log("✅ Pagamento confirmado!")
          setStatus("confirmed")
          setIsWaitingForWebhook(false)
          callbackExecutedRef.current = true
          onPaymentConfirmed?.(paymentInfo)
        } else if (webhookData.is_denied && !callbackExecutedRef.current) {
          log("❌ Pagamento negado!")
          setStatus("denied")
          setIsWaitingForWebhook(false)
          callbackExecutedRef.current = true
          onPaymentDenied?.(paymentInfo)
        } else if (webhookData.is_expired && !callbackExecutedRef.current) {
          log("⏰ Pagamento vencido!")
          setStatus("expired")
          setIsWaitingForWebhook(false)
          callbackExecutedRef.current = true
          onPaymentExpired?.(paymentInfo)
        } else if (webhookData.is_canceled && !callbackExecutedRef.current) {
          log("🚫 Pagamento cancelado!")
          setStatus("canceled")
          setIsWaitingForWebhook(false)
          callbackExecutedRef.current = true
          onPaymentCanceled?.(paymentInfo)
        } else if (webhookData.is_refunded && !callbackExecutedRef.current) {
          log("↩️ Pagamento reembolsado!")
          setStatus("refunded")
          setIsWaitingForWebhook(false)
          callbackExecutedRef.current = true
          onPaymentRefunded?.(paymentInfo)
        } else {
          log(`Status intermediário: ${webhookData.status_title}`)
          setStatus("pending")
          setIsWaitingForWebhook(true)
        }
      } else {
        log("Dados não encontrados no Supabase - aguardando webhook")
        setStatus("waiting")
        setIsWaitingForWebhook(true)
      }

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      log("Erro ao verificar status:", errorMessage)
      setError(errorMessage)
    }
  }, [externalId, log, onPaymentConfirmed, onPaymentDenied, onPaymentExpired, onPaymentCanceled, onPaymentRefunded])

  // Iniciar monitoramento quando externalId estiver disponível
  useEffect(() => {
    if (!externalId) {
      log("Aguardando external ID...")
      return
    }

    log(`Iniciando monitoramento para: ${externalId}`)
    setIsWaitingForWebhook(true)
    callbackExecutedRef.current = false

    // Verificação inicial
    checkPaymentStatus()

    // Configurar intervalo de verificação (a cada 5 segundos)
    intervalRef.current = setInterval(checkPaymentStatus, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      log("Monitoramento parado")
    }
  }, [externalId, checkPaymentStatus, log])

  // Parar monitoramento quando status final for atingido
  useEffect(() => {
    if (
      status === "confirmed" ||
      status === "denied" ||
      status === "expired" ||
      status === "canceled" ||
      status === "refunded"
    ) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        log(`Monitoramento parado - status final: ${status}`)
      }
    }
  }, [status, log])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    paymentData,
  }
}
