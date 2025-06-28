"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface PaymentStatus {
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusName: string
  amount: number
  paymentDate?: string
}

interface UseOptimizedPaymentWebhookOptions {
  externalId: string | null
  checkInterval?: number
  maxRetries?: number
  backoffMultiplier?: number
  onPaymentConfirmed?: (data: PaymentStatus) => void
  onPaymentDenied?: (data: PaymentStatus) => void
  onPaymentExpired?: (data: PaymentStatus) => void
}

export function useOptimizedPaymentWebhook({
  externalId,
  checkInterval = 8000,
  maxRetries = 3,
  backoffMultiplier = 1.5,
  onPaymentConfirmed,
  onPaymentDenied,
  onPaymentExpired,
}: UseOptimizedPaymentWebhookOptions) {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isActiveRef = useRef<boolean>(true)

  // Monitor tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden

      if (document.hidden) {
        // Pause checking when tab is not active
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }

        // Cancel ongoing request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        console.log("🚫 Payment monitoring paused - tab not active")
      } else if (externalId && !status?.isPaid) {
        // Resume checking when tab becomes active
        console.log("🔄 Payment monitoring resumed - tab active")
        startMonitoring()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [externalId, status?.isPaid])

  const checkPaymentStatus = useCallback(
    async (attempt = 0): Promise<void> => {
      if (!externalId || !isActiveRef.current) {
        console.log("🚫 Skipping payment check - no externalId or tab not active")
        return
      }

      try {
        setIsChecking(true)
        setError(null)

        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController()

        console.log(`🔍 Checking payment status (attempt ${attempt + 1}/${maxRetries + 1}) for:`, externalId)

        const response = await fetch(`/api/tryplopay/payment-status?externalId=${externalId}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            "Cache-Control": "no-cache",
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = await response.json()
        setLastChecked(new Date())
        setRetryCount(attempt)

        console.log("📋 Payment status result:", result)

        if (result.success && result.found) {
          const paymentData = result.data
          setStatus(paymentData)

          console.log("✅ Payment status updated:", {
            isPaid: paymentData.isPaid,
            isDenied: paymentData.isDenied,
            isRefunded: paymentData.isRefunded,
            isExpired: paymentData.isExpired,
            isCanceled: paymentData.isCanceled,
            statusName: paymentData.statusName,
          })

          // Trigger callbacks
          if (paymentData.isPaid && onPaymentConfirmed) {
            console.log("🎉 PAYMENT CONFIRMED - Triggering callback")
            onPaymentConfirmed(paymentData)
          } else if (paymentData.isDenied && onPaymentDenied) {
            console.log("❌ PAYMENT DENIED - Triggering callback")
            onPaymentDenied(paymentData)
          } else if (paymentData.isExpired && onPaymentExpired) {
            console.log("⏰ PAYMENT EXPIRED - Triggering callback")
            onPaymentExpired(paymentData)
          }

          // Stop monitoring if payment is final
          if (paymentData.isPaid || paymentData.isDenied || paymentData.isExpired || paymentData.isCanceled) {
            stopMonitoring()
          }
        } else {
          console.log("⏳ Payment still pending for:", externalId)
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.log("🚫 Payment check aborted")
          return
        }

        console.error("❌ Error checking payment status:", error)
        setError(error.message || "Unknown error")

        // Retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = checkInterval * Math.pow(backoffMultiplier, attempt)
          console.log(`🔄 Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)

          setTimeout(() => {
            checkPaymentStatus(attempt + 1)
          }, delay)
        } else {
          console.error("❌ Max retries reached for payment status check")
          setError("Max retries reached. Please refresh the page.")
        }
      } finally {
        setIsChecking(false)
      }
    },
    [externalId, maxRetries, backoffMultiplier, checkInterval, onPaymentConfirmed, onPaymentDenied, onPaymentExpired],
  )

  const startMonitoring = useCallback(() => {
    if (!externalId || status?.isPaid || !isActiveRef.current) {
      console.log("🚫 Not starting monitoring:", { externalId, isPaid: status?.isPaid, isActive: isActiveRef.current })
      return
    }

    console.log("🔄 Starting optimized payment monitoring for:", externalId)

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Check immediately
    checkPaymentStatus(0)

    // Set up interval for subsequent checks
    intervalRef.current = setInterval(() => {
      if (isActiveRef.current && !status?.isPaid) {
        checkPaymentStatus(0)
      }
    }, checkInterval)
  }, [externalId, status?.isPaid, checkInterval, checkPaymentStatus])

  const stopMonitoring = useCallback(() => {
    console.log("🛑 Stopping payment monitoring")

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Start monitoring when externalId is available
  useEffect(() => {
    if (externalId && !status?.isPaid) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [externalId, status?.isPaid, startMonitoring, stopMonitoring])

  return {
    status,
    isChecking,
    error,
    lastChecked,
    retryCount,
    startMonitoring,
    stopMonitoring,
  }
}
