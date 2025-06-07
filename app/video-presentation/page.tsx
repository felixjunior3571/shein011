"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { usePageTracking } from "@/hooks/use-tracking"

export default function VideoPresentation() {
  const router = useRouter()
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [showPlayButton, setShowPlayButton] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Rastreia a página de apresentação de vídeo
  usePageTracking("video_presentation")

  // Listener para eventos do Vimeo
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Aceita mensagens do Vimeo
      if (event.origin !== "https://player.vimeo.com") return

      try {
        const data = JSON.parse(event.data)
        console.log("Evento Vimeo recebido:", data)

        if (data.event === "ready") {
          setVideoLoaded(true)
          console.log("✅ Vídeo carregado e pronto!")
        }

        if (data.event === "ended") {
          setVideoEnded(true)
          console.log("🎬 Vídeo terminou!")
        }
      } catch (error) {
        console.log("Erro ao processar evento Vimeo:", error)
      }
    }

    // Timer automático para mostrar o botão após 1 minuto
    const autoTimer = setTimeout(() => {
      setVideoEnded(true)
      console.log("⏰ Timer automático: Vídeo considerado concluído após 1 minuto")
    }, 60000) // 60 segundos = 1 minuto

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
      clearTimeout(autoTimer)
    }
  }, [])

  // Função para iniciar manualmente o vídeo (caso autoplay falhe)
  const handleManualPlay = () => {
    if (iframeRef.current) {
      // Tenta enviar mensagem para o iframe do Vimeo para iniciar o vídeo
      try {
        const iframe = iframeRef.current
        const player = new (window as any).Vimeo.Player(iframe)
        player.play()
        setShowPlayButton(false)
      } catch (error) {
        console.error("Erro ao iniciar o vídeo manualmente:", error)
      }
    }
  }

  // Função para continuar para a próxima página
  const handleContinue = () => {
    router.push("/shipping-method")
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-8 px-4">
      <div className="max-w-3xl w-full mx-auto text-center">
        {/* Headline */}
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Seu Cartão SHEIN Está Quase Pronto!</h1>

        {/* Subheadline */}
        <p className="text-lg text-gray-600 mb-8">
          Assista este breve vídeo para desbloquear seus benefícios de crédito
        </p>

        {/* Video Container */}
        <div className="w-full mb-8">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            {/* Loading indicator */}
            {!videoLoaded && (
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium">Carregando vídeo...</p>
                </div>
              </div>
            )}

            {/* Vimeo iframe */}
            <iframe
              ref={iframeRef}
              src="https://player.vimeo.com/video/1091396114?h=1e70929118&autoplay=1&title=0&byline=0&portrait=0&background=0&muted=0&controls=0&loop=0&api=1"
              className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                videoLoaded ? "opacity-100" : "opacity-0"
              }`}
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Apresentação do Cartão SHEIN"
            ></iframe>

            {/* Manual play button if autoplay fails */}
            {showPlayButton && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <button
                  onClick={handleManualPlay}
                  className="bg-white rounded-full p-6 hover:bg-gray-100 transition-colors"
                  aria-label="Reproduzir vídeo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CTA Button - Appears immediately but becomes more prominent after video ends */}
        <div className="transition-all duration-500">
          <button
            onClick={handleContinue}
            className={`bg-black text-white font-bold py-4 px-8 rounded-md hover:bg-black/90 transition-all ${
              videoEnded ? "transform scale-110 shadow-lg animate-pulse" : "opacity-80 hover:opacity-100"
            }`}
          >
            {videoEnded ? "CONTINUAR PARA PRÓXIMA ETAPA" : "PRÓXIMA ETAPA"}
          </button>

          {videoEnded && (
            <p className="mt-4 text-green-600 font-medium animate-bounce">✓ Vídeo concluído! Clique para continuar</p>
          )}
        </div>
      </div>
    </main>
  )
}
