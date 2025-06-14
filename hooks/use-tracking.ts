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
  }
}

export function useTracking() {
  // Função para rastrear eventos
  const trackEvent = (eventData: TrackingEvent) => {
    try {
      // Rastreamento via Utmify
      if (typeof window !== "undefined" && window.utmify) {
        window.utmify.track(eventData.event, eventData)
      }

      // Rastreamento via dataLayer (Google Analytics/GTM)
      if (typeof window !== "undefined" && (window as any).dataLayer) {
        ;(window as any).dataLayer.push({
          event: eventData.event,
          ...eventData,
        })
      }

      // Log para debug
      console.log("Tracking Event:", eventData)
    } catch (error) {
      console.error("Erro no rastreamento:", error)
    }
  }

  // Função para rastrear pageview
  const trackPageView = (page: string) => {
    try {
      if (typeof window !== "undefined" && window.utmify) {
        window.utmify.pageview(page)
      }

      trackEvent({
        event: "page_view",
        page: page,
      })
    } catch (error) {
      console.error("Erro no rastreamento de pageview:", error)
    }
  }

  // Funções específicas para eventos do funil
  const trackFunnelStep = (step: string, page: string) => {
    trackEvent({
      event: "funnel_step",
      step: step,
      page: page,
    })
  }

  const trackQuizAnswer = (question: string, answer: string) => {
    trackEvent({
      event: "quiz_answer",
      question: question,
      answer: answer,
    })
  }

  const trackFormSubmit = (formType: string, success = true) => {
    trackEvent({
      event: "form_submit",
      form_type: formType,
      success: success,
    })
  }

  const trackShippingSelection = (method: string, price: string) => {
    trackEvent({
      event: "shipping_selected",
      shipping_method: method,
      shipping_price: price,
    })
  }

  const trackPaymentAttempt = (method: string, amount: string) => {
    trackEvent({
      event: "payment_attempt",
      payment_method: method,
      amount: amount,
    })
  }

  const trackCardApproval = (limit: string) => {
    trackEvent({
      event: "card_approved",
      credit_limit: limit,
    })
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

// Hook para rastrear automaticamente pageviews
export function usePageTracking(pageName: string) {
  const { trackPageView, trackFunnelStep } = useTracking()

  useEffect(() => {
    trackPageView(pageName)
    trackFunnelStep(pageName, window.location.pathname)
  }, [pageName, trackPageView, trackFunnelStep])
}
