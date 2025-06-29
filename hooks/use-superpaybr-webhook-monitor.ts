"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

// Inicializar Supabase
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate?: string
}

interface UseSuperpaybrWebhookMonitorProps {
  externalId: string | null
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
}

export function useSuperpaybrWebhookMonitor({
  externalId,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: UseSuperpaybrWebhookMonitorProps) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const callbacksExecuted = useRef(new Set<string>())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[SuperPayBR Monitor] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  // Função para executar callback apenas uma vez
  const executeCallback = useCallback(
    (callbackName: string, callback: ((data: PaymentStatus) => void) | undefined, data: PaymentStatus) => {
      const key = `${externalId}_${callbackName}`
      if (!callbacksExecuted.current.has(key) && callback) {
        callbacksExecuted.current.add(key)
        callback(data)
        log(`Callback executado: ${callbackName}`, data)
      }
    },
    [externalId, log],
  )

  // Função para verificar status no localStorage
  const checkLocalStorage = useCallback(() => {
    if (!externalId) return null

    try {
      const webhookData = localStorage.getItem(`webhook_payment_${externalId}`)
      if (webhookData) {
        const parsedData = JSON.parse(webhookData)
        log("Status encontrado no localStorage", parsedData)
        return parsedData
      }
    } catch (error) {
      log("Erro ao ler localStorage", error)
    }

    return null
  }, [externalId, log])

  // Função para verificar status no Supabase
  const checkSupabase = useCallback(async () => {
    if (!externalId) return null

    try {
      const { data, error: supabaseError } = await supabase
        .from("payment_webhooks")
        .select("*")
        .eq("external_id", externalId)
        .eq("provider", "superpaybr")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (supabaseError) {
        if (supabaseError.code !== "PGRST116") {
          // PGRST116 = no rows returned
          log("Erro no Supabase", supabaseError)
        }
        return null
      }

      if (data) {
        const paymentStatus: PaymentStatus = {
          isPaid: data.is_paid,
          isDenied: data.is_denied,
          isRefunded: data.is_refunded,
          isExpired: data.is_expired,
          isCanceled: data.is_canceled,
          statusCode: data.status_code,
          statusName: data.status_name,
          amount: data.amount,
          paymentDate: data.payment_date,
        }

        log("Status encontrado no Supabase", paymentStatus)
        return paymentStatus
      }
    } catch (error) {
      log("Erro ao consultar Supabase", error)
    }

    return null
  }, [externalId, log])

  // Função principal de verificação
  const checkPaymentStatus = useCallback(async () => {
    if (!externalId) return

    setLastCheck(new Date())
    log(`Verificando status do pagamento: ${externalId}`)

    try {
      // 1. Verificar localStorage primeiro (mais rápido)
      let paymentStatus = checkLocalStorage()

      // 2. Se não encontrou no localStorage, verificar Supabase
      if (!paymentStatus) {
        paymentStatus = await checkSupabase()
      }

      if (paymentStatus) {
        setStatus(paymentStatus)
        setIsWaitingForWebhook(false)
        setError(null)

        // Executar callbacks baseados no status
        if (paymentStatus.isPaid) {
          executeCallback("confirmed", onPaymentConfirmed, paymentStatus)
        } else if (paymentStatus.isDenied) {
          executeCallback("denied", onPaymentDenied, paymentStatus)
        } else if (paymentStatus.isExpired) {
          executeCallback("expired", onPaymentExpired, paymentStatus)
        } else if (paymentStatus.isCanceled) {
          executeCallback("canceled", onPaymentCanceled, paymentStatus)
        } else if (paymentStatus.isRefunded) {
          executeCallback("refunded", onPaymentRefunded, paymentStatus)
        }

        // Parar monitoramento se o pagamento foi finalizado
        if (
          paymentStatus.isPaid ||
          paymentStatus.isDenied ||
          paymentStatus.isExpired ||
          paymentStatus.isCanceled ||
          paymentStatus.isRefunded
        ) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          log("Monitoramento finalizado - status definitivo recebido")
        }
      } else {
        setIsWaitingForWebhook(true)
        log("Aguardando webhook...")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setError(errorMessage)
      log("Erro na verificação", error)
    }
  }, [
    externalId,
    log,
    checkLocalStorage,
    checkSupabase,
    executeCallback,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Iniciar monitoramento quando externalId estiver disponível
  useEffect(() => {
    if (!externalId) {
      log("External ID não disponível ainda")
      return
    }

    log(`Iniciando monitoramento para: ${externalId}`)
    setIsWaitingForWebhook(true)

    // Verificação inicial
    checkPaymentStatus()

    // Verificação periódica a cada 5 segundos
    intervalRef.current = setInterval(checkPaymentStatus, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      log("Monitoramento finalizado")
    }
  }, [externalId, checkPaymentStatus, log])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
  }
}
