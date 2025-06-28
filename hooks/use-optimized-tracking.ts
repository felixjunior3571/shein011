"use client"

import { useEffect, useCallback, useRef } from "react"

// Tipos para os eventos de rastreamento
interface TrackingEvent {
  event: string
  data: Record<string, any>
  timestamp: number
}

interface UseOptimizedTrackingOptions {
  batchSize?: number
  batchInterval?: number
  maxCacheSize?: number
  enableDebug?: boolean
}

// Declaração global para o Utmify
declare global {
  interface Window {
    pixelId?: string
    utmify?: {
      track: (event: string, data: Record<string, any>) => void
    }
    gtag?: (command: string, event: string, data: Record<string, any>) => void
  }
}

export function useOptimizedTracking({
  batchSize = 5,
  batchInterval = 2000, // 2 seconds
  maxCacheSize = 50,
  enableDebug = false,
}: UseOptimizedTrackingOptions = {}) {
  const eventQueue = useRef<TrackingEvent[]>([])
  const eventCache = useRef<Set<string>>(new Set())
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastPageViewRef = useRef<number>(0)
  const isActiveRef = useRef<boolean>(true)

  // Monitor tab visibility to pause tracking when inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden

      if (enableDebug) {
        console.log(
          `📊 Tracking ${document.hidden ? "paused" : "resumed"} - tab ${document.hidden ? "inactive" : "active"}`,
        )
      }

      // Flush queue when tab becomes inactive
      if (document.hidden) {
        flushEventQueue()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableDebug])

  // Generate cache key for deduplication
  const generateCacheKey = useCallback((event: string, data: Record<string, any>): string => {
    return `${event}_${JSON.stringify(data)}_${Math.floor(Date.now() / 5000)}` // 5-second window
  }, [])

  // Flush event queue
  const flushEventQueue = useCallback(() => {
    if (eventQueue.current.length === 0) return

    const events = [...eventQueue.current]
    eventQueue.current = []

    if (enableDebug) {
      console.log(`📊 Flushing ${events.length} tracking events:`, events)
    }

    // Send events in batch
    if (typeof window !== "undefined" && window.gtag) {
      events.forEach(({ event, data }) => {
        try {
          window.gtag("event", event, data)
        } catch (error) {
          console.error("❌ Error sending tracking event:", error)
        }
      })
    }

    // Send to UTMify if available
    if (typeof window !== "undefined" && (window as any).utmify) {
      events.forEach(({ event, data }) => {
        try {
          ;(window as any).utmify.track(event, data)
        } catch (error) {
          console.error("❌ Error sending UTMify event:", error)
        }
      })
    }
  }, [enableDebug])

  // Schedule batch flush
  const scheduleBatchFlush = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
    }

    batchTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        flushEventQueue()
      }
    }, batchInterval)
  }, [batchInterval, flushEventQueue])

  // Track event with optimization
  const track = useCallback(
    (event: string, data: Record<string, any> = {}) => {
      // Skip if tab is not active
      if (!isActiveRef.current) {
        if (enableDebug) {
          console.log("📊 Skipping tracking - tab not active:", event)
        }
        return
      }

      // Generate cache key for deduplication
      const cacheKey = generateCacheKey(event, data)

      // Skip if event was recently tracked
      if (eventCache.current.has(cacheKey)) {
        if (enableDebug) {
          console.log("📊 Skipping duplicate event:", event)
        }
        return
      }

      // Add to cache
      eventCache.current.add(cacheKey)

      // Clean cache if it gets too large
      if (eventCache.current.size > maxCacheSize) {
        const entries = Array.from(eventCache.current)
        const toDelete = entries.slice(0, Math.floor(maxCacheSize / 2))
        toDelete.forEach((key) => eventCache.current.delete(key))
      }

      // Add event to queue
      const trackingEvent: TrackingEvent = {
        event,
        data: {
          ...data,
          timestamp: Date.now(),
          page_url: window.location.href,
          page_title: document.title,
        },
        timestamp: Date.now(),
      }

      eventQueue.current.push(trackingEvent)

      if (enableDebug) {
        console.log("📊 Event queued:", trackingEvent)
      }

      // Flush immediately if batch size reached
      if (eventQueue.current.length >= batchSize) {
        flushEventQueue()
      } else {
        scheduleBatchFlush()
      }
    },
    [batchSize, generateCacheKey, maxCacheSize, enableDebug, flushEventQueue, scheduleBatchFlush],
  )

  // Track page view with throttling
  const trackPageView = useCallback(
    (path?: string) => {
      const now = Date.now()

      // Throttle page views to max 1 per 3 seconds
      if (now - lastPageViewRef.current < 3000) {
        if (enableDebug) {
          console.log("📊 Page view throttled")
        }
        return
      }

      lastPageViewRef.current = now

      track("page_view", {
        page_path: path || window.location.pathname,
        page_search: window.location.search,
        page_hash: window.location.hash,
      })
    },
    [track, enableDebug],
  )

  // Track conversion with enhanced data
  const trackConversion = useCallback(
    (conversionType: string, value?: number, currency = "BRL") => {
      track("conversion", {
        conversion_type: conversionType,
        value: value || 0,
        currency,
        conversion_id: `${conversionType}_${Date.now()}`,
      })
    },
    [track],
  )

  // Track form interaction
  const trackFormInteraction = useCallback(
    (formName: string, action: "start" | "complete" | "error", step?: string) => {
      track("form_interaction", {
        form_name: formName,
        form_action: action,
        form_step: step,
      })
    },
    [track],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush remaining events on unmount
      flushEventQueue()

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current)
      }
    }
  }, [flushEventQueue])

  return {
    track,
    trackPageView,
    trackConversion,
    trackFormInteraction,
    flushEvents: flushEventQueue,
    queueSize: eventQueue.current.length,
  }
}
