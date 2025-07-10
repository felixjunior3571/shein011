"use client"

import { useEffect } from "react"

// Tipos para os eventos de rastreamento
interface TrackingEvent {
  event: string
  page?: string
  step?: string
  value?: string | number
  method?: string
  [key: string]: any
}

// Declaração global para o Utmify
declare global {
  interface Window {
    utmify?: {
      track: (event: string, data?: any) => void
      pageview: (page?: string) => void
    }
    pixelId?: string
    dataLayer?: any[]
    trackUTMifyFunnel: (eventName: string, properties?: Record<string, any>) => void
    testUTMify: () => boolean
  }
}

export function useTracking() {
  useEffect(() => {
    // UTMify tracking initialization
    if (typeof window !== "undefined") {
      // Track page view
      if (window.utmify) {
        window.utmify.track("page_view", {
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }, [])

  // Função para rastrear eventos com tratamento de erro robusto
  const trackEvent = (eventData: TrackingEvent) => {
    try {
      // Verifica se está no ambiente do navegador
      if (typeof window === "undefined") {
        console.log("Tracking Event (SSR):", eventData)
        return
      }

      // Rastreamento via Utmify com verificação
      if (window.utmify && typeof window.utmify.track === "function") {
        try {
          window.utmify.track(eventData.event, {
            ...eventData,
            timestamp: new Date().toISOString(),
            page: window.location.pathname,
          })
        } catch (utmifyError) {
          console.warn("Erro no rastreamento Utmify:", utmifyError)
        }
      }

      // Rastreamento via dataLayer (Google Analytics/GTM) com verificação
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        try {
          window.dataLayer.push({
            event: eventData.event,
            ...eventData,
          })
        } catch (dataLayerError) {
          console.warn("Erro no dataLayer:", dataLayerError)
        }
      }

      // Log para debug apenas em desenvolvimento
      if (process.env.NODE_ENV === "development") {
        console.log("Tracking Event:", eventData)
      }
    } catch (error) {
      console.warn("Erro geral no rastreamento:", error)
    }
  }

  // Função para rastrear pageview com tratamento de erro robusto
  const trackPageView = (page: string) => {
    try {
      // Verifica se está no ambiente do navegador
      if (typeof window === "undefined") {
        console.log("Page View (SSR):", page)
        return
      }

      if (window.utmify && typeof window.utmify.pageview === "function") {
        try {
          window.utmify.pageview(page)
        } catch (utmifyError) {
          console.warn("Erro no pageview Utmify:", utmifyError)
        }
      }

      trackEvent({
        event: "page_view",
        page: page,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de pageview:", error)
    }
  }

  // Funções específicas para eventos do funil com tratamento de erro
  const trackFunnelStep = (step: string, page: string) => {
    try {
      trackEvent({
        event: "funnel_step",
        step: step,
        page: page,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de funnel step:", error)
    }
  }

  const trackQuizAnswer = (question: string, answer: string) => {
    try {
      trackEvent({
        event: "quiz_answer",
        question: question,
        answer: answer,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de quiz answer:", error)
    }
  }

  const trackFormSubmit = (formType: string, success = true) => {
    try {
      trackEvent({
        event: "form_submit",
        form_type: formType,
        success: success,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de form submit:", error)
    }
  }

  const trackShippingSelection = (method: string, price: string) => {
    try {
      trackEvent({
        event: "shipping_selected",
        shipping_method: method,
        shipping_price: price,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de shipping selection:", error)
    }
  }

  const trackPaymentAttempt = (method: string, amount: string) => {
    try {
      trackEvent({
        event: "payment_attempt",
        payment_method: method,
        amount: amount,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de payment attempt:", error)
    }
  }

  const trackCardApproval = (limit: string) => {
    try {
      trackEvent({
        event: "card_approved",
        credit_limit: limit,
      })
    } catch (error) {
      console.warn("Erro no rastreamento de card approval:", error)
    }
  }

  return {
    trackEvent,
    trackPageView,
    trackFunnelStep,
    trackQuizAnswer,
    trackFormSubmit,
    trackShippingSelection,
    trackPaymentAttempt,
    trackCardApproval,
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

// Global tracking function
if (typeof window !== "undefined") {
  window.trackUTMifyFunnel = (eventName: string, properties?: Record<string, any>) => {
    if (window.utmify) {
      window.utmify.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
        page: window.location.pathname,
      })
      console.log(`✅ UTMify Funnel Event: ${eventName}`, properties)
    }
  }

  window.testUTMify = () => {
    if (window.utmify) {
      console.log("✅ UTMify está funcionando!")
      return true
    } else {
      console.log("❌ UTMify não está carregado")
      return false
    }
  }
}
