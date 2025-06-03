class TrackingService {
  private sessionId: string
  private isInitialized = false
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
    // Só inicializa se estiver no browser
    if (typeof window !== "undefined") {
      this.init()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async init() {
    if (this.isInitialized) return

    try {
      console.log("🚀 Inicializando tracking service...")

      // Register session immediately
      await this.registerSession()

      // Start heartbeat every 30 seconds
      this.startHeartbeat()

      // Track page views
      this.trackPageView()

      // Handle page visibility changes
      this.handleVisibilityChange()

      // Handle page unload
      this.handlePageUnload()

      this.isInitialized = true
      console.log("✅ Tracking service inicializado com sucesso")
    } catch (error) {
      console.error("❌ Falha ao inicializar tracking:", error)
    }
  }

  private async registerSession() {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          currentPage: window.location.pathname,
          userAgent: navigator.userAgent,
        }),
      })

      if (response.ok) {
        console.log("📝 Sessão registrada:", this.sessionId.substring(0, 8))
      } else {
        console.warn("⚠️ Falha ao registrar sessão:", response.status)
      }
    } catch (error) {
      console.error("❌ Erro ao registrar sessão:", error)
    }
  }

  private startHeartbeat() {
    // Clear existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    // Update session every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!document.hidden) {
        this.registerSession()
        console.log("💓 Heartbeat enviado")
      }
    }, 30000)

    console.log("⏰ Heartbeat iniciado (30s)")
  }

  private handleVisibilityChange() {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // Page became visible, register session
        this.registerSession()
        console.log("👁️ Página visível - sessão atualizada")
      }
    })
  }

  private handlePageUnload() {
    // Use sendBeacon for reliable tracking on page unload
    window.addEventListener("beforeunload", () => {
      const data = JSON.stringify({
        sessionId: this.sessionId,
        event: "page_unload",
        timestamp: new Date().toISOString(),
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/sessions", data)
      }
    })

    // Also handle pagehide for mobile
    window.addEventListener("pagehide", () => {
      const data = JSON.stringify({
        sessionId: this.sessionId,
        event: "page_hide",
        timestamp: new Date().toISOString(),
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/sessions", data)
      }
    })
  }

  private trackPageView() {
    this.trackEvent("page_view", {
      page: window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    })
  }

  async trackEvent(eventType: string, eventData: any = {}) {
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: this.sessionId,
          event_type: eventType,
          event_data: eventData,
          page: window.location.pathname,
          timestamp: new Date().toISOString(),
        }),
      })
      console.log("📊 Evento rastreado:", eventType)
    } catch (error) {
      console.error("❌ Falha ao rastrear evento:", error)
    }
  }

  async trackLead(leadData: any) {
    try {
      // Get UTM parameters
      const urlParams = new URLSearchParams(window.location.search)
      const utmData = {
        utm_source: urlParams.get("utm_source"),
        utm_medium: urlParams.get("utm_medium"),
        utm_campaign: urlParams.get("utm_campaign"),
        utm_term: urlParams.get("utm_term"),
        utm_content: urlParams.get("utm_content"),
      }

      const fullLeadData = {
        ...leadData,
        ...utmData,
        session_id: this.sessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        created_at: new Date().toISOString(),
      }

      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullLeadData),
      })

      // Track lead event
      this.trackEvent("lead_captured", fullLeadData)
      console.log("👤 Lead capturado:", leadData.name || leadData.email)
    } catch (error) {
      console.error("❌ Falha ao capturar lead:", error)
    }
  }

  getSessionId(): string {
    return this.sessionId
  }

  // Method to manually trigger session update
  updateSession() {
    this.registerSession()
  }

  // Cleanup method
  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.isInitialized = false
  }
}

// Export singleton instance
export const trackingService = new TrackingService()

// Auto-initialize when module loads in browser
if (typeof window !== "undefined") {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    trackingService.updateSession()
  }, 1000)
}
