"use client"

import { useEffect } from "react"

export function useOnlineTracking() {
  useEffect(() => {
    let cleanup: (() => void) | undefined

    const initTracking = async () => {
      try {
        // Aguarda um pouco para garantir que a página carregou
        await new Promise((resolve) => setTimeout(resolve, 500))

        const { trackingService } = await import("@/services/tracking-service")

        console.log("🎯 Inicializando tracking na página:", window.location.pathname)

        // Força atualização da sessão
        trackingService.updateSession()

        // Registra visualização de página
        trackingService.trackEvent("page_view", {
          url: window.location.href,
          path: window.location.pathname,
          referrer: document.referrer,
          timestamp: new Date().toISOString(),
        })

        // Atualiza sessão quando a página ganha foco
        const handleFocus = () => {
          trackingService.updateSession()
          console.log("🔄 Página ganhou foco - sessão atualizada")
        }

        // Atualiza sessão quando há interação do usuário
        const handleInteraction = () => {
          trackingService.updateSession()
        }

        window.addEventListener("focus", handleFocus)
        window.addEventListener("click", handleInteraction, { once: true })
        window.addEventListener("scroll", handleInteraction, { once: true })

        cleanup = () => {
          window.removeEventListener("focus", handleFocus)
          window.removeEventListener("click", handleInteraction)
          window.removeEventListener("scroll", handleInteraction)
        }

        console.log("✅ Tracking configurado com sucesso")
      } catch (error) {
        console.error("❌ Erro ao configurar tracking:", error)
      }
    }

    initTracking()

    return () => {
      cleanup?.()
    }
  }, [])
}
