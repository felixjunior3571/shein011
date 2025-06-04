"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePageTracking, useTracking } from "@/hooks/use-tracking"

export default function VSLPage() {
  const router = useRouter()
  const { trackEvent } = useTracking()
  const [showButton, setShowButton] = useState(false)
  const [timeLeft, setTimeLeft] = useState(10 * 60) // 10 minutos em segundos

  // Rastreia a página VSL
  usePageTracking("vsl")

  // Contador regressivo
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Mostrar botão após 20 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true)
    }, 20000) // 20 segundos

    return () => clearTimeout(timer)
  }, [])

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleContinue = () => {
    trackEvent({
      event: "vsl_continue",
      page: "vsl",
      action: "continue_to_final",
    })
    router.push("/final-confirmation")
  }

  return (
    <main className="min-h-full bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Título principal */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-red-600 mb-2">🚨 ÚLTIMA CHANCE</h1>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">Cartão SHEIN com limite pré-aprovado</h2>

            {/* Contador regressivo */}
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
              <p className="text-red-700 font-semibold mb-2">⏰ Oferta expira em:</p>
              <div className="text-2xl font-bold text-red-600">{formatTime(timeLeft)}</div>
            </div>

            {/* Escassez */}
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-6">
              <p className="text-yellow-800 font-semibold">
                🔥 Apenas <span className="text-red-600 font-bold">37 vagas</span> restantes hoje
              </p>
            </div>
          </div>

          {/* Container do vídeo Vimeo */}
          <div className="relative rounded-lg overflow-hidden shadow-lg mb-6 aspect-video">
            <iframe
              src="https://player.vimeo.com/video/1090481912?h=8810f8f59c&autoplay=1&loop=0&muted=0&title=0&byline=0&portrait=0&controls=1"
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vídeo VSL - Cartão SHEIN"
            ></iframe>
          </div>

          {/* Indicadores de autoridade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-green-600 text-2xl mb-2">✅</div>
              <p className="text-green-800 font-semibold">Aprovado pelo Banco Central</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-blue-600 text-2xl mb-2">🛡️</div>
              <p className="text-blue-800 font-semibold">Garantia de Aprovação</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-purple-600 text-2xl mb-2">🚫</div>
              <p className="text-purple-800 font-semibold">Sem consulta SPC/Serasa</p>
            </div>
          </div>

          {/* Botão de ação */}
          <div className="text-center">
            {showButton ? (
              <button
                onClick={handleContinue}
                className="bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-xl hover:bg-red-700 transition-colors animate-pulse"
              >
                🚀 QUERO MEU CARTÃO AGORA!
              </button>
            ) : (
              <div className="bg-gray-100 text-gray-500 py-4 px-8 rounded-lg text-xl">
                ⏳ Assista o vídeo para continuar...
              </div>
            )}
          </div>

          {/* Texto de urgência */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">⚠️ Esta oferta é válida apenas para os próximos visitantes</p>
          </div>
        </div>
      </div>
    </main>
  )
}
