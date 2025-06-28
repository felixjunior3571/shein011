"use client"

import { useEffect, useCallback, useRef } from "react"

// Tipos para os eventos de rastreamento
interface TrackingEvent {
  event: string
  properties: Record<string, any>
  timestamp: number
}

interface UseOptimizedTrackingOptions {
  enableDebug?: boolean
  batchSize?: number
  batchInterval?: number
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
  enableDebug = false,
  batchSize = 5,
  batchInterval = 2000,
}: UseOptimizedTrackingOptions = {}) {
  const eventQueueRef = useRef<TrackingEvent[]>([])
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef<boolean>(true)
  const sentEventsRef = useRef<Set<string>>(new Set())

  // Monitor tab visibility to pause tracking when inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden

      if (enableDebug) {
        console.log(
          `📊 Tracking ${document.hidden ? "paused" : "resumed"} - tab ${document.hidden ? "inactive" : "active"}`,
        )
      }

      // Flush queue when tab becomes active
      if (!document.hidden && eventQueueRef.current.length > 0) {
        flushEventQueue()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [enableDebug])

  // Flush event queue
  const flushEventQueue = useCallback(() => {
    if (eventQueueRef.current.length === 0) return

    const eventsToSend = [...eventQueueRef.current]
    eventQueueRef.current = []

    if (enableDebug) {
      console.log(`📊 Flushing ${eventsToSend.length} tracking events:`, eventsToSend)
    }

    // Send events (in a real app, this would go to your analytics service)
    eventsToSend.forEach((event) => {
      if (enableDebug) {
        console.log(`📊 Tracking: ${event.event}`, event.properties)
      }
    })

    // Clear batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current)
      batchTimeoutRef.current = null
    }
  }, [enableDebug])

  // Schedule batch flush
  const scheduleBatchFlush = useCallback(() => {
    if (batchTimeoutRef.current) return

    batchTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        flushEventQueue()
      }
    }, batchInterval)
  }, [batchInterval, flushEventQueue])

  // Track event with batching and deduplication
  const track = useCallback(
    (event: string, properties: Record<string, any> = {}) => {
      // Don't track if tab is inactive
      if (!isActiveRef.current) {
        if (enableDebug) {
          console.log(`📊 Skipping tracking (tab inactive): ${event}`)
        }
        return
      }

      // Create unique key for deduplication
      const eventKey = `${event}_${JSON.stringify(properties)}_${Date.now()}`

      // Check for recent duplicates (within 5 seconds)
      const recentDuplicateKey = `${event}_${JSON.stringify(properties)}`
      if (sentEventsRef.current.has(recentDuplicateKey)) {
        if (enableDebug) {
          console.log(`📊 Skipping duplicate event: ${event}`)
        }
        return
      }

      // Add to deduplication set with expiry
      sentEventsRef.current.add(recentDuplicateKey)
      setTimeout(() => {
        sentEventsRef.current.delete(recentDuplicateKey)
      }, 5000)

      // Add to queue
      eventQueueRef.current.push({
        event,
        properties: {
          ...properties,
          timestamp: Date.now(),
          url: window.location.href,
          user_agent: navigator.userAgent,
        },
        timestamp: Date.now(),
      })

      if (enableDebug) {
        console.log(`📊 Queued event: ${event} (queue size: ${eventQueueRef.current.length})`)
      }

      // Flush immediately if batch size reached
      if (eventQueueRef.current.length >= batchSize) {
        flushEventQueue()
      } else {
        scheduleBatchFlush()
      }
    },
    [batchSize, enableDebug, flushEventQueue, scheduleBatchFlush],
  )

  // Track page view
  const trackPageView = useCallback(
    (page: string, properties: Record<string, any> = {}) => {
      track("page_view", {
        page,
        ...properties,
      })
    },
    [track],
  )

  // Track conversion
  const trackConversion = useCallback(
    (conversionType: string, value: number, properties: Record<string, any> = {}) => {
      track("conversion", {
        conversion_type: conversionType,
        value,
        ...properties,
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
    flushEventQueue,
  }
}
