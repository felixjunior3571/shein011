"use client"

import { useState, useEffect, useRef, useCallback } from "react"

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
}

interface UsePureWebhookMonitorOptions {
  externalId: string | null
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  enableDebug?: boolean
}

export function usePureWebhookMonitor({
  externalId,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enableDebug = false,
}: UsePureWebhookMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastWebhookCheck, setLastWebhookCheck] = useState<Date | null>(null)

  const hasTriggeredCallbackRef = useRef<boolean>(false)
  const isActiveRef = useRef<boolean>(true)
  const storageCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Monitor tab visibility to pause when inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden

      if (enableDebug) {
        console.log(
          `💳 Webhook monitor ${document.hidden ? "paused" : "resumed"} - tab ${document.hidden ? "inactive" : "active"}`,
        )
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableDebug])

  // Check localStorage for webhook data (NO API CALLS!)
  const checkLocalStorageForWebhookData = useCallback((): boolean => {
    if (!externalId || !isActiveRef.current) {
      return false
    }

    try {
      // Check if webhook data was stored by the webhook endpoint
      const webhookDataKey = `webhook_payment_${externalId}`
      const storedWebhookData = localStorage.getItem(webhookDataKey)

      if (storedWebhookData) {
        const paymentData: PaymentStatus = JSON.parse(storedWebhookData)
        setStatus(paymentData)
        setLastWebhookCheck(new Date())

        if (enableDebug) {
          console.log("✅ Webhook data found in localStorage:", paymentData)
        }

        // Trigger callbacks only once
        if (!hasTriggeredCallbackRef.current) {
          if (paymentData.isPaid && onPaymentConfirmed) {
            console.log("🎉 PAYMENT CONFIRMED VIA WEBHOOK (localStorage)!")
            onPaymentConfirmed(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isDenied && onPaymentDenied) {
            console.log("❌ PAYMENT DENIED VIA WEBHOOK (localStorage)!")
            onPaymentDenied(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isExpired && onPaymentExpired) {
            console.log("⏰ PAYMENT EXPIRED VIA WEBHOOK (localStorage)!")
            onPaymentExpired(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isCanceled && onPaymentCanceled) {
            console.log("🚫 PAYMENT CANCELED VIA WEBHOOK (localStorage)!")
            onPaymentCanceled(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isRefunded && onPaymentRefunded) {
            console.log("🔄 PAYMENT REFUNDED VIA WEBHOOK (localStorage)!")
            onPaymentRefunded(paymentData)
            hasTriggeredCallbackRef.current = true
          }
        }

        return true // Webhook data found
      } else {
        if (enableDebug) {
          console.log("⏳ No webhook data in localStorage yet for:", externalId)
        }
        return false // No webhook data yet
      }
    } catch (error: any) {
      console.error("❌ Error checking localStorage for webhook data:", error)
      setError(error.message || "Unknown error")
      return false
    }
  }, [
    externalId,
    enableDebug,
    onPaymentConfirmed,
    onPaymentDenied,
    onPaymentExpired,
    onPaymentCanceled,
    onPaymentRefunded,
  ])

  // Start monitoring (PURE WEBHOOK - NO API CALLS)
  const startMonitoring = useCallback(() => {
    if (
      !externalId ||
      status?.isPaid ||
      status?.isDenied ||
      status?.isExpired ||
      status?.isCanceled ||
      status?.isRefunded
    ) {
      if (enableDebug) {
        console.log("🚫 Not starting monitoring - payment already final or no externalId")
      }
      return
    }

    console.log("🚀 Starting PURE webhook monitoring for:", externalId)
    console.log("📢 NO API CALLS - Only localStorage checks!")
    setIsWaitingForWebhook(true)
    setError(null)
    hasTriggeredCallbackRef.current = false

    // Check localStorage immediately
    const webhookDataFound = checkLocalStorageForWebhookData()

    if (!webhookDataFound) {
      // Start periodic localStorage checks (NO API CALLS!)
      storageCheckIntervalRef.current = setInterval(() => {
        if (isActiveRef.current) {
          const found = checkLocalStorageForWebhookData()
          if (found) {
            // Stop checking once webhook data is found
            if (storageCheckIntervalRef.current) {
              clearInterval(storageCheckIntervalRef.current)
              storageCheckIntervalRef.current = null
            }
            setIsWaitingForWebhook(false)
          }
        }
      }, 2000) // Check localStorage every 2 seconds
    } else {
      setIsWaitingForWebhook(false)
    }
  }, [externalId, status, enableDebug, checkLocalStorageForWebhookData])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (enableDebug) {
      console.log("🛑 Stopping webhook monitoring")
    }

    setIsWaitingForWebhook(false)

    if (storageCheckIntervalRef.current) {
      clearInterval(storageCheckIntervalRef.current)
      storageCheckIntervalRef.current = null
    }
  }, [enableDebug])

  // Auto-start monitoring when externalId is available
  useEffect(() => {
    if (
      externalId &&
      !status?.isPaid &&
      !status?.isDenied &&
      !status?.isExpired &&
      !status?.isCanceled &&
      !status?.isRefunded
    ) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId, status, startMonitoring, stopMonitoring])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  return {
    status,
    isWaitingForWebhook,
    error,
    lastWebhookCheck,
    checkNow: checkLocalStorageForWebhookData,
    startMonitoring,
    stopMonitoring,
  }
}
