"use client"

import { useCallback, useEffect, useRef } from "react"

interface TrackingOptions {
  enableDebug?: boolean
  batchSize?: number
  flushInterval?: number
}

interface TrackingEvent {
  event: string
  data: any
  timestamp: string
}

export function useOptimizedTracking({
  enableDebug = false,
  batchSize = 10,
  flushInterval = 5000,
}: TrackingOptions = {}) {
  const eventQueue = useRef<TrackingEvent[]>([])
  const flushTimer = useRef<NodeJS.Timeout | null>(null)

  const log = useCallback(
    (message: string, data?: any) => {
      if (enableDebug) {
        console.log(`[Tracking] ${message}`, data || "")
      }
    },
    [enableDebug],
  )

  // Flush events to UTMify
  const flushEvents = useCallback(() => {
    if (eventQueue.current.length === 0) return

    const events = [...eventQueue.current]
    eventQueue.current = []

    events.forEach(({ event, data }) => {
      try {
        if (typeof window !== "undefined" && window.trackUTMify) {
          window.trackUTMify(event, data)
          log(`✅ Tracked: ${event}`, data)
        } else {
          log(`⚠️ UTMify not available for: ${event}`, data)
        }
      } catch (error) {
        log(`❌ Error tracking: ${event}`, error)
      }
    })
  }, [log])

  // Add event to queue
  const queueEvent = useCallback(
    (event: string, data: any) => {
      const trackingEvent: TrackingEvent = {
        event,
        data,
        timestamp: new Date().toISOString(),
      }

      eventQueue.current.push(trackingEvent)
      log(`📝 Queued: ${event}`, data)

      // Flush if batch size reached
      if (eventQueue.current.length >= batchSize) {
        flushEvents()
      }

      // Reset flush timer
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
      }
      flushTimer.current = setTimeout(flushEvents, flushInterval)
    },
    [batchSize, flushEvents, flushInterval, log],
  )

  // Track generic event
  const track = useCallback(
    (event: string, data: any = {}) => {
      queueEvent(event, {
        ...data,
        page: typeof window !== "undefined" ? window.location.pathname : "",
        timestamp: new Date().toISOString(),
      })
    },
    [queueEvent],
  )

  // Track page view
  const trackPageView = useCallback(
    (page: string, additionalData: any = {}) => {
      track("page_view", {
        page,
        url: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
        ...additionalData,
      })
    },
    [track],
  )

  // Track conversion
  const trackConversion = useCallback(
    (type: string, value: number, additionalData: any = {}) => {
      track("conversion", {
        type,
        value,
        currency: "BRL",
        ...additionalData,
      })
    },
    [track],
  )

  // Track PIX generation
  const trackPixGenerated = useCallback(
    (amount: number, paymentType: string, additionalData: any = {}) => {
      track("pix_generated", {
        amount,
        payment_type: paymentType,
        currency: "BRL",
        ...additionalData,
      })
    },
    [track],
  )

  // Track form submission
  const trackFormSubmit = useCallback(
    (formName: string, additionalData: any = {}) => {
      track("form_submit", {
        form_name: formName,
        ...additionalData,
      })
    },
    [track],
  )

  // Track button click
  const trackButtonClick = useCallback(
    (buttonName: string, additionalData: any = {}) => {
      track("button_click", {
        button_name: buttonName,
        ...additionalData,
      })
    },
    [track],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
      }
      flushEvents() // Flush remaining events
    }
  }, [flushEvents])

  // Flush events on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushEvents()
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload)
      return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [flushEvents])

  return {
    track,
    trackPageView,
    trackConversion,
    trackPixGenerated,
    trackFormSubmit,
    trackButtonClick,
    flushEvents,
  }
}
