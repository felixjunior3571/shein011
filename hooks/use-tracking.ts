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
  }
}

export function useTracking() {
  // Função para rastrear eventos com tratamento de erro
  const trackEvent = (eventData: TrackingEvent) => {
    try {
      // Rastreamento via Utmify
      if (typeof window !== "undefined" && window.utmify) {
        window.utmify.track(eventData.event, eventData)
      }

      // Rastreamento via dataLayer (Google Analytics/GTM)
      if (typeof window !== "undefined" && window.dataLayer) {
        window.dataLayer.push({
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

  // Função para rastrear pageview com tratamento de erro
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

// Hook para rastrear automaticamente pageviews com tratamento de erro
export function usePageTracking(pageName: string) {
  const { trackPageView, trackFunnelStep } = useTracking()

  useEffect(() => {
    try {
      // Aguarda um pouco para garantir que a página carregou
      const timer = setTimeout(() => {
        trackPageView(pageName)

        // Verifica se window.location está disponível antes de usar
        if (typeof window !== "undefined" && window.location) {
          trackFunnelStep(pageName, window.location.pathname)
        }
      }, 100)

      return () => clearTimeout(timer)
    } catch (error) {
      console.error("Erro no rastreamento automático da página:", error)
    }
  }, [pageName, trackPageView, trackFunnelStep])
}
