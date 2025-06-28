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

interface UseWebhookPaymentMonitorOptions {
  externalId: string | null
  fallbackCheckInterval?: number // Only as fallback, not primary method
  maxFallbackChecks?: number
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
  onPaymentCanceled?: (data: PaymentStatus) => void
  onPaymentRefunded?: (data: PaymentStatus) => void
  enableDebug?: boolean
}

export function useWebhookPaymentMonitor({
  externalId,
  fallbackCheckInterval = 30000, // 30 seconds as fallback only
  maxFallbackChecks = 10, // Maximum 10 fallback checks (5 minutes total)
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
  onPaymentCanceled,
  onPaymentRefunded,
  enableDebug = false,
}: UseWebhookPaymentMonitorOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastWebhookCheck, setLastWebhookCheck] = useState<Date | null>(null)
  const [fallbackCheckCount, setFallbackCheckCount] = useState(0)

  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const webhookCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(true)
  const hasTriggeredCallbackRef = useRef<boolean>(false)

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden

      if (enableDebug) {
        console.log(
          `💳 Payment monitor ${document.hidden ? "paused" : "resumed"} - tab ${document.hidden ? "inactive" : "active"}`,
        )
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableDebug])

  // Check if webhook data is available (primary method)
  const checkWebhookData = useCallback(async (): Promise<boolean> => {
    if (!externalId || !isActiveRef.current) {
      return false
    }

    try {
      if (enableDebug) {
        console.log("🔍 Checking webhook data for:", externalId)
      }

      const response = await fetch(`/api/tryplopay/payment-status?externalId=${externalId}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setLastWebhookCheck(new Date())

      if (result.success && result.found) {
        const paymentData: PaymentStatus = result.data
        setStatus(paymentData)

        if (enableDebug) {
          console.log("✅ Webhook data found:", paymentData)
        }

        // Trigger callbacks only once
        if (!hasTriggeredCallbackRef.current) {
          if (paymentData.isPaid && onPaymentConfirmed) {
            console.log("🎉 PAYMENT CONFIRMED VIA WEBHOOK!")
            onPaymentConfirmed(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isDenied && onPaymentDenied) {
            console.log("❌ PAYMENT DENIED VIA WEBHOOK!")
            onPaymentDenied(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isExpired && onPaymentExpired) {
            console.log("⏰ PAYMENT EXPIRED VIA WEBHOOK!")
            onPaymentExpired(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isCanceled && onPaymentCanceled) {
            console.log("🚫 PAYMENT CANCELED VIA WEBHOOK!")
            onPaymentCanceled(paymentData)
            hasTriggeredCallbackRef.current = true
          } else if (paymentData.isRefunded && onPaymentRefunded) {
            console.log("🔄 PAYMENT REFUNDED VIA WEBHOOK!")
            onPaymentRefunded(paymentData)
            hasTriggeredCallbackRef.current = true
          }
        }

        return true // Webhook data found
      } else {
        if (enableDebug) {
          console.log("⏳ No webhook data yet for:", externalId)
        }
        return false // No webhook data yet
      }
    } catch (error: any) {
      console.error("❌ Error checking webhook data:", error)
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

  // Fallback check (only when webhook hasn't arrived)
  const performFallbackCheck = useCallback(async () => {
    if (!externalId || !isActiveRef.current || fallbackCheckCount >= maxFallbackChecks) {
      return
    }

    if (enableDebug) {
      console.log(`🔄 Performing fallback check ${fallbackCheckCount + 1}/${maxFallbackChecks} for:`, externalId)
    }

    const webhookDataFound = await checkWebhookData()
    setFallbackCheckCount((prev) => prev + 1)

    if (!webhookDataFound && fallbackCheckCount < maxFallbackChecks - 1) {
      // Schedule next fallback check
      fallbackTimeoutRef.current = setTimeout(() => {
        performFallbackCheck()
      }, fallbackCheckInterval)
    } else if (fallbackCheckCount >= maxFallbackChecks - 1) {
      console.log("⚠️ Maximum fallback checks reached. Relying on webhook only.")
      setError("Payment status check limit reached. Please refresh if payment was completed.")
    }
  }, [externalId, fallbackCheckCount, maxFallbackChecks, fallbackCheckInterval, checkWebhookData, enableDebug])

  // Start monitoring
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

    console.log("🚀 Starting webhook-based payment monitoring for:", externalId)
    setIsWaitingForWebhook(true)
    setError(null)
    setFallbackCheckCount(0)
    hasTriggeredCallbackRef.current = false

    // Primary method: Check for webhook data immediately
    checkWebhookData().then((webhookDataFound) => {
      if (!webhookDataFound) {
        // If no webhook data yet, start periodic checks for webhook data (not API polling)
        webhookCheckIntervalRef.current = setInterval(async () => {
          if (isActiveRef.current) {
            const found = await checkWebhookData()
            if (found) {
              // Stop checking once webhook data is found
              if (webhookCheckIntervalRef.current) {
                clearInterval(webhookCheckIntervalRef.current)
                webhookCheckIntervalRef.current = null
              }
              setIsWaitingForWebhook(false)
            }
          }
        }, 5000) // Check for webhook data every 5 seconds

        // Start fallback checks after 1 minute if no webhook received
        setTimeout(() => {
          if (isActiveRef.current && !status?.isPaid && !status?.isDenied) {
            console.log("⚠️ No webhook received after 1 minute, starting fallback checks")
            performFallbackCheck()
          }
        }, 60000) // 1 minute delay before fallback
      } else {
        setIsWaitingForWebhook(false)
      }
    })
  }, [externalId, status, enableDebug, checkWebhookData, performFallbackCheck])

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (enableDebug) {
      console.log("🛑 Stopping payment monitoring")
    }

    setIsWaitingForWebhook(false)

    if (webhookCheckIntervalRef.current) {
      clearInterval(webhookCheckIntervalRef.current)
      webhookCheckIntervalRef.current = null
    }

    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
      fallbackTimeoutRef.current = null
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
    fallbackCheckCount,
    maxFallbackChecks,
    checkNow: checkWebhookData,
    startMonitoring,
    stopMonitoring,
  }
}
