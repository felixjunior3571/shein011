"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string | null
  externalId: string
  invoiceId: string
  token: string
}

interface WebhookMonitorOptions {
  externalId: string | null
  invoiceId?: string | null
  token?: string | null
  enableDebug?: boolean
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
}

export function useSuperPayBRWebhookMonitor({
  externalId,
  invoiceId,
  token,
  enableDebug = false,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
}: WebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const callbackExecutedRef = useRef<boolean>(false)
  const paymentStatusRef = useRef<string>("waiting")

  const checkWebhookConfirmation = useCallback(async () => {
    if (!externalId || callbackExecutedRef.current || paymentStatusRef.current === "confirmed") {
      return
    }

    try {
      setError(null)
      setLastCheck(new Date())

      if (enableDebug) {
        console.log("🔍 Verificando confirmação webhook SuperPayBR:", {
          externalId,
          invoiceId,
          token,
        })
      }

      // ✅ CONSULTAR API DE STATUS COM MÚLTIPLAS CHAVES
      const params = new URLSearchParams()
      if (externalId) params.append("external_id", externalId)
      if (invoiceId) params.append("invoice_id", invoiceId)
      if (token) params.append("token", token)

      const response = await fetch(`/api/superpaybr/payment-status?${params.toString()}`, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success && result.found && result.data) {
        const paymentData: PaymentStatus = result.data

        setStatus(paymentData)

        if (enableDebug) {
          console.log("✅ Confirmação encontrada:", {
            isPaid: paymentData.isPaid,
            statusCode: paymentData.statusCode,
            statusName: paymentData.statusName,
          })
        }

        // ✅ EXECUTAR CALLBACKS APENAS UMA VEZ
        if (!callbackExecutedRef.current) {
          if (paymentData.isPaid && onPaymentConfirmed) {
            console.log("🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK!")
            callbackExecutedRef.current = true
            paymentStatusRef.current = "confirmed"
            setIsWaitingForWebhook(false)
            onPaymentConfirmed(paymentData)
          } else if (paymentData.isDenied && onPaymentDenied) {
            console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK!")
            callbackExecutedRef.current = true
            paymentStatusRef.current = "denied"
            setIsWaitingForWebhook(false)
            onPaymentDenied(paymentData)
          } else if (paymentData.isExpired && onPaymentExpired) {
            console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK!")
            callbackExecutedRef.current = true
            paymentStatusRef.current = "expired"
            setIsWaitingForWebhook(false)
            onPaymentExpired(paymentData)
          } else if (paymentData.isCanceled && onPaymentCanceled) {
            console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK!")
            callbackExecutedRef.current = true
            paymentStatusRef.current = "canceled"
            setIsWaitingForWebhook(false)
            onPaymentCanceled(paymentData)
          } else if (paymentData.isRefunded && onPaymentRefunded) {
            console.log("↩️ PAGAMENTO ESTORNADO VIA WEBHOOK!")
            callbackExecutedRef.current = true
            paymentStatusRef.current = "refunded"
            setIsWaitingForWebhook(false)
            onPaymentRefunded(paymentData)
          }
        }

        // ✅ PARAR MONITORAMENTO SE STATUS FINAL FOI ATINGIDO
        if (
          paymentData.isPaid ||
          paymentData.isDenied ||
          paymentData.isExpired ||
          paymentData.isCanceled ||
          paymentData.isRefunded
        ) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            if (enableDebug) {
              console.log("🛑 Monitoramento SuperPayBR parado - status final atingido")
            }
          }
        }
      } else {
        // Ainda aguardando webhook
        setIsWaitingForWebhook(true)
        if (enableDebug) {
          console.log("⏳ Aguardando confirmação via webhook SuperPayBR...")
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido SuperPayBR"
      setError(errorMessage)
      if (enableDebug) {
        console.error("❌ Erro ao verificar webhook SuperPayBR:", errorMessage)
      }
    }
  }, [
    externalId,
    invoiceId,
    token,
    enableDebug,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // ✅ MONITORAMENTO A CADA 3 SEGUNDOS
  useEffect(() => {
    if (!externalId || callbackExecutedRef.current) {
      return
    }

    if (enableDebug) {
      console.log("🚀 Iniciando monitoramento webhook SuperPayBR:", {
        externalId,
        invoiceId,
        token,
      })
    }

    setIsWaitingForWebhook(true)
    callbackExecutedRef.current = false
    paymentStatusRef.current = "waiting"

    // Verificação inicial imediata
    checkWebhookConfirmation()

    // ✅ VERIFICAR A CADA 3 SEGUNDOS
    intervalRef.current = setInterval(() => {
      if (!callbackExecutedRef.current && paymentStatusRef.current !== "confirmed") {
        checkWebhookConfirmation()
      }
    }, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (enableDebug) {
        console.log("🛑 Monitoramento SuperPayBR limpo")
      }
    }
  }, [externalId, invoiceId, token, checkWebhookConfirmation, enableDebug])

  // ✅ CLEANUP AO DESMONTAR COMPONENTE
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkWebhookConfirmation,
  }
}
