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

export function useSuperpayWebhookMonitor({
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
  const [paymentStatus, setPaymentStatus] = useState<string>("waiting")
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkWebhookConfirmation = useCallback(async () => {
    if (!externalId || paymentStatus === "confirmed") return

    try {
      setError(null)
      setLastCheck(new Date())

      if (enableDebug) {
        console.log("🔍 Verificando confirmação webhook SuperPay:", {
          externalId,
          invoiceId,
          token,
        })
      }

      const response = await fetch(`/api/superpay/payment-status?externalId=${externalId}`)
      const result = await response.json()

      if (result.success && result.found) {
        const { data } = result

        setStatus(data)

        if (data.isPaid) {
          setPaymentStatus("confirmed")
          setIsWaitingForWebhook(false)
          if (onPaymentConfirmed) {
            onPaymentConfirmed(data)
          }
        } else if (data.isDenied) {
          setPaymentStatus("denied")
          setIsWaitingForWebhook(false)
          if (onPaymentDenied) {
            onPaymentDenied(data)
          }
        } else if (data.isRefunded) {
          setPaymentStatus("refunded")
          setIsWaitingForWebhook(false)
          if (onPaymentRefunded) {
            onPaymentRefunded(data)
          }
        } else if (data.isExpired) {
          setPaymentStatus("expired")
          setIsWaitingForWebhook(false)
          if (onPaymentExpired) {
            onPaymentExpired(data)
          }
        } else if (data.isCanceled) {
          setPaymentStatus("canceled")
          setIsWaitingForWebhook(false)
          if (onPaymentCanceled) {
            onPaymentCanceled(data)
          }
        }

        if (enableDebug) {
          console.log("✅ Status encontrado:", {
            isPaid: data.isPaid,
            statusCode: data.statusCode,
            statusName: data.statusName,
          })
        }
      } else {
        setIsWaitingForWebhook(true)
        if (enableDebug) {
          console.log("⏳ Aguardando confirmação via webhook SuperPay...")
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido SuperPay"
      setError(errorMessage)
      if (enableDebug) {
        console.error("❌ Erro ao verificar webhook SuperPay:", errorMessage)
      }
    }
  }, [
    externalId,
    paymentStatus,
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
    if (!externalId || paymentStatus === "confirmed") return

    if (enableDebug) {
      console.log("🚀 Iniciando monitoramento webhook SuperPay:", {
        externalId,
        invoiceId,
        token,
      })
    }

    setIsWaitingForWebhook(true)

    // Verificação inicial imediata
    checkWebhookConfirmation()

    // ✅ VERIFICAR A CADA 3 SEGUNDOS
    intervalRef.current = setInterval(checkWebhookConfirmation, 3000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (enableDebug) {
        console.log("🛑 Monitoramento SuperPay limpo")
      }
    }
  }, [externalId, paymentStatus, checkWebhookConfirmation, enableDebug])

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
    paymentStatus,
    status,
    isWaitingForWebhook,
    error,
    lastCheck,
    checkWebhookConfirmation,
  }
}
