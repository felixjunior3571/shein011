"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePageTracking, useTracking } from "@/hooks/use-tracking"

export default function SocialProofPage() {
  const router = useRouter()
  const { trackEvent } = useTracking()
  const video1Ref = useRef<HTMLVideoElement>(null)
  const video2Ref = useRef<HTMLVideoElement>(null)
  const [video1Ended, setVideo1Ended] = useState(false)
  const [video2Ended, setVideo2Ended] = useState(false)
  const [bothVideosEnded, setBothVideosEnded] = useState(false)
  const [showPlayButton, setShowPlayButton] = useState(false)
  const [videosLoaded, setVideosLoaded] = useState({ video1: false, video2: false })

  // Rastreia a página de provas sociais
  usePageTracking("social_proof")

  useEffect(() => {
    // Configurar ambos os vídeos quando a página carregar
    if (video1Ref.current) {
      video1Ref.current.volume = 1.0
      video1Ref.current.load() // Força o carregamento do vídeo
    }

    if (video2Ref.current) {
      video2Ref.current.volume = 1.0
      video2Ref.current.load() // Força o carregamento do vídeo
    }

    // Tentar iniciar o primeiro vídeo após um pequeno delay
    const timer = setTimeout(() => {
      if (video1Ref.current && videosLoaded.video1) {
        video1Ref.current.play().catch((error) => {
          console.error("Erro ao reproduzir o primeiro vídeo automaticamente:", error)
          setShowPlayButton(true)
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [videosLoaded.video1])

  // Função para iniciar manualmente o primeiro vídeo (caso autoplay falhe)
  const handleManualPlay = () => {
    if (video1Ref.current) {
      video1Ref.current.volume = 1.0
      video1Ref.current.play()
      setShowPlayButton(false)
    }
  }

  // Quando o primeiro vídeo terminar, inicia o segundo
  const handleVideo1End = () => {
    setVideo1Ended(true)
    trackEvent({
      event: "video_completed",
      video_id: "shein1",
      page: "social_proof",
    })

    if (video2Ref.current) {
      video2Ref.current.volume = 1.0
      video2Ref.current.play().catch((error) => {
        console.error("Erro ao reproduzir o segundo vídeo automaticamente:", error)
        setVideo2Ended(true)
      })
    }
  }

  // Quando o segundo vídeo terminar
  const handleVideo2End = () => {
    setVideo2Ended(true)
    trackEvent({
      event: "video_completed",
      video_id: "shein2",
      page: "social_proof",
    })
    setBothVideosEnded(true)
  }

  // Handlers para quando os vídeos carregarem
  const handleVideo1LoadedData = () => {
    if (video1Ref.current) {
      video1Ref.current.volume = 1.0
      setVideosLoaded((prev) => ({ ...prev, video1: true }))
    }
  }

  const handleVideo2LoadedData = () => {
    if (video2Ref.current) {
      video2Ref.current.volume = 1.0
      setVideosLoaded((prev) => ({ ...prev, video2: true }))
    }
  }

  const handleContinue = () => {
    trackEvent({
      event: "social_proof_continue",
      page: "social_proof",
      action: "continue_to_final",
    })
    router.push("/final-confirmation")
  }

  return (
    <main className="min-h-full bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Histórias reais de quem já está usando</h1>

          <p className="text-center text-gray-600 mb-8">
            Veja depoimentos de pessoas que já estão aproveitando todos os benefícios do cartão SHEIN
          </p>

          {/* Container para os vídeos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Primeiro vídeo - shein1.mp4 */}
            <div className="relative rounded-lg overflow-hidden shadow-md bg-gray-100">
              <video
                ref={video1Ref}
                className="w-full h-auto"
                controls={video1Ended || showPlayButton}
                playsInline
                preload="metadata"
                onEnded={handleVideo1End}
                onLoadedData={handleVideo1LoadedData}
                onError={(e) => console.error("Erro no primeiro vídeo:", e)}
              >
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/shein1-06XF1CCMTsHEWXUMT4HUuMg50OdBJv.mp4"
                  type="video/mp4"
                />
                Seu navegador não suporta o elemento de vídeo.
              </video>

              {/* Botão de play manual caso autoplay falhe */}
              {showPlayButton && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <button
                    onClick={handleManualPlay}
                    className="bg-white rounded-full p-4 hover:bg-gray-100 transition-colors"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 5V19L19 12L8 5Z" fill="black" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Loading indicator para o primeiro vídeo */}
              {!videosLoaded.video1 && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white font-medium">Ana, 29 anos</p>
                <p className="text-white/80 text-sm">Cliente há 4 meses</p>
              </div>
            </div>

            {/* Segundo vídeo - shein2.mp4 */}
            <div className="relative rounded-lg overflow-hidden shadow-md bg-gray-100">
              <video
                ref={video2Ref}
                className="w-full h-auto"
                controls={video1Ended}
                playsInline
                preload="metadata"
                onEnded={handleVideo2End}
                onLoadedData={handleVideo2LoadedData}
                onError={(e) => console.error("Erro no segundo vídeo:", e)}
              >
                <source
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/shein2-LhXPA20I9cBCCV3udXM3H0JLZscqju.mp4"
                  type="video/mp4"
                />
                Seu navegador não suporta o elemento de vídeo.
              </video>

              {/* Loading indicator para o segundo vídeo */}
              {!videosLoaded.video2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              )}

              {/* Overlay indicando que o vídeo está aguardando */}
              {!video1Ended && videosLoaded.video2 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="bg-white/90 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-800">Aguardando...</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white font-medium">Juliana, 35 anos</p>
                <p className="text-white/80 text-sm">Cliente há 6 meses</p>
              </div>
            </div>
          </div>

          {/* Mensagem de assistindo */}
          {!bothVideosEnded && !showPlayButton && videosLoaded.video1 && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm font-medium">
                  {!video1Ended ? "Assistindo primeiro depoimento..." : "Assistindo segundo depoimento..."}
                </span>
              </div>
            </div>
          )}

          {/* Botão de continuar - aparece apenas quando ambos os vídeos terminaram */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              className="bg-black text-white font-bold py-3 px-8 rounded-md hover:bg-black/90 transition-colors"
            >
              SIM, VOU QUERER!
            </button>

            <style jsx>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
              }
            `}</style>
          </div>
        </div>
      </div>
    </main>
  )
}
