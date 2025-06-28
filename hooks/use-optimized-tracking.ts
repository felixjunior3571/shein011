"use client"

import { useCallback, useEffect, useRef } from "react"

interface TrackingOptions {
  enableDebug?: boolean
  batchSize?: number
  flushInterval?: number
}

interface TrackingEvent {
  event: string
  timestamp: number
  page?: string
  [key: string]: any
}

export function useOptimizedTracking(options: TrackingOptions = {}) {
  const { enableDebug = false, batchSize = 10, flushInterval = 5000 } = options

  const eventQueue = useRef<TrackingEvent[]>([])
  const flushTimer = useRef<NodeJS.Timeout | null>(null)

  // Função para verificar se UTMify está disponível
  const isUTMifyAvailable = useCallback(() => {
    return typeof window !== "undefined" && window.utmify && typeof window.utmify.track === "function"
  }, [])

  // Função para flush dos eventos em batch
  const flushEvents = useCallback(() => {
    if (eventQueue.current.length === 0) return

    const events = [...eventQueue.current]
    eventQueue.current = []

    if (enableDebug) {
      console.log(`📊 Flushing ${events.length} tracking events:`, events)
    }

    // Enviar eventos para UTMify
    if (isUTMifyAvailable()) {
      events.forEach((event) => {
        try {
          window.utmify.track(event.event, event)
        } catch (error) {
          console.warn("Erro ao enviar evento para UTMify:", error)
        }
      })
    }

    // Enviar para dataLayer
    if (typeof window !== "undefined" && window.dataLayer) {
      events.forEach((event) => {
        try {
          window.dataLayer.push({
            event: event.event,
            ...event,
          })
        } catch (error) {
          console.warn("Erro ao enviar evento para dataLayer:", error)
        }
      })
    }
  }, [enableDebug, isUTMifyAvailable])

  // Função para adicionar evento à fila
  const queueEvent = useCallback(
    (event: TrackingEvent) => {
      eventQueue.current.push(event)

      // Flush imediato se atingir o tamanho do batch
      if (eventQueue.current.length >= batchSize) {
        flushEvents()
      } else {
        // Agendar flush se não houver timer ativo
        if (!flushTimer.current) {
          flushTimer.current = setTimeout(() => {
            flushEvents()
            flushTimer.current = null
          }, flushInterval)
        }
      }
    },
    [batchSize, flushInterval, flushEvents],
  )

  // Função principal de tracking
  const track = useCallback(
    (event: string, data: Record<string, any> = {}) => {
      try {
        const trackingEvent: TrackingEvent = {
          event,
          timestamp: Date.now(),
          ...data,
        }

        if (enableDebug) {
          console.log("📈 Tracking event:", trackingEvent)
        }

        queueEvent(trackingEvent)
      } catch (error) {
        console.warn("Erro no tracking:", error)
      }
    },
    [enableDebug, queueEvent],
  )

  // Função para tracking de pageview
  const trackPageView = useCallback(
    (page: string) => {
      track("page_view", {
        page,
        url: typeof window !== "undefined" ? window.location.href : "",
        referrer: typeof document !== "undefined" ? document.referrer : "",
        timestamp: Date.now(),
      })
    },
    [track],
  )

  // Função para tracking de conversão
  const trackConversion = useCallback(
    (conversionType: string, value?: number) => {
      track("conversion", {
        conversion_type: conversionType,
        value,
        currency: "BRL",
        timestamp: Date.now(),
      })
    },
    [track],
  )

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
      }
      // Flush final dos eventos pendentes
      flushEvents()
    }
  }, [flushEvents])

  // Flush eventos quando a página for fechada
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushEvents()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushEvents()
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", handleBeforeUnload)
      document.addEventListener("visibilitychange", handleVisibilityChange)

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload)
        document.removeEventListener("visibilitychange", handleVisibilityChange)
      }
    }
  }, [flushEvents])

  return {
    track,
    trackPageView,
    trackConversion,
    isUTMifyAvailable: isUTMifyAvailable(),
    flushEvents,
  }
}

// Declarações globais para TypeScript
declare global {
  interface Window {
    utmify?: {
      track: (event: string, data?: any) => void
      pageview: (page?: string) => void
    }
    pixelId?: string
    dataLayer?: any[]
  }
}
