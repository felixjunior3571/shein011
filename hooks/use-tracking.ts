"use client"

import { useEffect, useCallback } from "react"

// Tipos para os eventos de rastreamento
interface TrackingEvent {
  event: string
  page?: string
  step?: string
  value?: string | number
  method?: string
  [key: string]: any
}

interface TrackingData {
  [key: string]: any
}

// Declaração global para o Utmify
declare global {
  interface Window {
    utmify?: {
      track: (event: string, data?: any) => void
      pageview: (page?: string) => void
    }
    trackUTMifyFunnel?: (event: string, data: any) => void
    utmifyQueue?: Array<{ event: string; data: any }>
    testUTMify?: () => boolean
    pixelId?: string
    dataLayer?: any[]
  }
}

export function useTracking() {
  // Função para rastrear eventos com tratamento de erro robusto
  const trackEvent = useCallback((event: string, data: TrackingData = {}) => {
    try {
      // Verifica se está no ambiente do navegador
      if (typeof window === "undefined") {
        console.log("Tracking Event (SSR):", event, data)
        return
      }

      // UTMify tracking via função global
      if (window.trackUTMifyFunnel) {
        window.trackUTMifyFunnel(event, data)
      }

      // Rastreamento via Utmify direto com verificação
      if (window.utmify && typeof window.utmify.track === "function") {
        try {
          window.utmify.track(event, {
            ...data,
            funnel: "shein_card",
            timestamp: new Date().toISOString(),
          })
        } catch (utmifyError) {
          console.warn("Erro no rastreamento Utmify:", utmifyError)
        }
      }

      // Rastreamento via dataLayer (Google Analytics/GTM) com verificação
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        try {
          window.dataLayer.push({
            event: event,
            ...data,
          })
        } catch (dataLayerError) {
          console.warn("Erro no dataLayer:", dataLayerError)
        }
      }

      // Console log para debug
      console.log(`📊 Event tracked: ${event}`, data)
    } catch (error) {
      console.error("Erro no tracking:", error)
    }
  }, [])

  // Função para rastrear pageview com tratamento de erro robusto
  const trackPageView = useCallback(
    (page: string, data: TrackingData = {}) => {
      trackEvent("page_view", {
        page,
        step: page.replace("/", "") || "home",
        ...data,
      })
    },
    [trackEvent],
  )

  // Funções específicas para eventos do funil com tratamento de erro
  const trackFunnelStep = useCallback(
    (step: string, page: string) => {
      try {
        trackEvent("funnel_step", {
          step: step,
          page: page,
        })
      } catch (error) {
        console.warn("Erro no rastreamento de funnel step:", error)
      }
    },
    [trackEvent],
  )

  const trackQuizAnswer = useCallback(
    (question: string, answer: string) => {
      try {
        trackEvent("quiz_answer", {
          question: question,
          answer: answer,
        })
      } catch (error) {
        console.warn("Erro no rastreamento de quiz answer:", error)
      }
    },
    [trackEvent],
  )

  const trackFormSubmit = useCallback(
    (formType: string, success = true) => {
      try {
        trackEvent("form_submit", {
          form_type: formType,
          success: success,
        })
      } catch (error) {
        console.warn("Erro no rastreamento de form submit:", error)
      }
    },
    [trackEvent],
  )

  const trackShippingSelection = useCallback(
    (method: string, price: string) => {
      try {
        trackEvent("shipping_selected", {
          shipping_method: method,
          shipping_price: price,
        })
      } catch (error) {
        console.warn("Erro no rastreamento de shipping selection:", error)
      }
    },
    [trackEvent],
  )

  const trackPaymentAttempt = useCallback(
    (method: string, amount: string) => {
      try {
        trackEvent("payment_attempt", {
          payment_method: method,
          amount: amount,
        })
      } catch (error) {
        console.warn("Erro no rastreamento de payment attempt:", error)
      }
    },
    [trackEvent],
  )

  const trackCardApproval = useCallback(
    (limit: string) => {
      try {
        trackEvent("card_approved", {
          credit_limit: limit,
        })
      } catch (error) {
        console.warn("Erro no rastreamento de card approval:", error)
      }
    },
    [trackEvent],
  )

  const trackConversion = useCallback(
    (conversionType: string, data: TrackingData = {}) => {
      trackEvent("conversion", {
        type: conversionType,
        ...data,
      })
    },
    [trackEvent],
  )

  return {
    trackEvent,
    trackPageView,
    trackFunnelStep,
    trackQuizAnswer,
    trackFormSubmit,
    trackShippingSelection,
    trackPaymentAttempt,
    trackCardApproval,
    trackConversion,
  }
}

// Hook para rastrear automaticamente pageviews com tratamento de erro robusto
export function usePageTracking(pageName: string) {
  const { trackPageView, trackFunnelStep } = useTracking()

  useEffect(() => {
    // Verifica se está no ambiente do navegador
    if (typeof window === "undefined") {
      return
    }

    try {
      // Aguarda um pouco para garantir que a página carregou
      const timer = setTimeout(() => {
        try {
          trackPageView(pageName)

          // Verifica se window.location está disponível antes de usar
          if (window.location && window.location.pathname) {
            trackFunnelStep(pageName, window.location.pathname)
          }
        } catch (trackingError) {
          console.warn("Erro no rastreamento da página:", trackingError)
        }
      }, 100)

      return () => clearTimeout(timer)
    } catch (error) {
      console.warn("Erro no setup do rastreamento automático da página:", error)
    }
  }, [pageName, trackPageView, trackFunnelStep])
}
