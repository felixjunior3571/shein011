"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Check, Volume2, VolumeX, Plus, Minus } from "lucide-react"

export default function ShippingMethodPage() {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoVolume, setVideoVolume] = useState(0.35) // Volume inicial em 35%
  const [isMuted, setIsMuted] = useState(false)
  const router = useRouter()

  const shippingMethods = [
    {
      id: "pac",
      name: "PAC",
      description: "Entrega em 8 a 12 dias úteis",
      price: "19.90",
      originalPrice: "29.90",
      discount: "33% OFF",
    },
    {
      id: "sedex",
      name: "SEDEX",
      description: "Entrega em 3 a 5 dias úteis",
      price: "29.90",
      originalPrice: "39.90",
      discount: "25% OFF",
    },
    {
      id: "express",
      name: "EXPRESS",
      description: "Entrega em 1 a 2 dias úteis",
      price: "39.90",
      originalPrice: "59.90",
      discount: "33% OFF",
    },
  ]

  // Função para definir o volume do vídeo
  const setVideoVolumeLevel = (volume: number) => {
    const iframe = document.querySelector("iframe")
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          method: "setVolume",
          value: volume,
        }),
        "https://player.vimeo.com",
      )
      console.log(`🔊 Volume definido para: ${Math.round(volume * 100)}%`)
    }
  }

  useEffect(() => {
    // Listener para mensagens do Vimeo
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com") return

      try {
        const data = JSON.parse(event.data)
        console.log("📹 Evento Vimeo:", data)

        if (data.event === "ready") {
          setVideoLoaded(true)
          console.log("✅ Vídeo carregado e pronto!")

          // Define o volume para 35% imediatamente quando pronto
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
          setTimeout(() => setVideoVolumeLevel(0.35), 500)
          setTimeout(() => setVideoVolumeLevel(0.35), 1000)
        }

        if (data.event === "loaded") {
          console.log("📹 Vídeo loaded!")
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
        }

        if (data.event === "play") {
          console.log("▶️ Vídeo iniciado!")
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
        }
      } catch (error) {
        console.error("Erro ao processar mensagem do Vimeo:", error)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId)
  }

  const handleContinue = () => {
    if (selectedMethod) {
      const method = shippingMethods.find((m) => m.id === selectedMethod)
      if (method) {
        // Salva o método selecionado no localStorage
        localStorage.setItem("selectedShippingMethod", JSON.stringify(method))
        router.push("/checkout")
      }
    }
  }

  const adjustVolume = (change: number) => {
    const newVolume = Math.max(0, Math.min(1, videoVolume + change))
    setVideoVolume(newVolume)
    setVideoVolumeLevel(newVolume)
  }

  const toggleMute = () => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setVideoVolumeLevel(newMuted ? 0 : videoVolume)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-4">Escolha o método de entrega</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-6">Selecione a opção que melhor atende suas necessidades</p>

          {/* Video Section */}
          <div className="mb-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <iframe
                src="https://player.vimeo.com/video/1037913442?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=0&volume=0.35"
                width="100%"
                height="200"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                title="Shipping Video"
                className="w-full"
              />

              {/* Volume Controls */}
              <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-black/50 rounded-lg p-2">
                <button
                  onClick={() => adjustVolume(-0.1)}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label="Diminuir volume"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label={isMuted ? "Ativar som" : "Silenciar"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => adjustVolume(0.1)}
                  className="text-white hover:text-gray-300 transition-colors"
                  aria-label="Aumentar volume"
                >
                  <Plus className="w-4 h-4" />
                </button>

                <span className="text-white text-xs min-w-[3rem]">
                  {Math.round((isMuted ? 0 : videoVolume) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Methods */}
          <div className="space-y-4 mb-6">
            {shippingMethods.map((method) => (
              <div
                key={method.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedMethod === method.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleMethodSelect(method.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedMethod === method.id ? "border-black bg-black" : "border-gray-300"
                        }`}
                      >
                        {selectedMethod === method.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{method.name}</h3>
                        <p className="text-gray-600 text-sm">{method.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                        {method.discount}
                      </span>
                    </div>
                    <p className="text-gray-400 line-through text-sm">R$ {method.originalPrice}</p>
                    <p className="font-bold text-lg text-green-600">R$ {method.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedMethod}
            className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
              selectedMethod ? "bg-black text-white hover:bg-black/90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            CONTINUAR
          </button>
        </div>
      </div>
    </div>
  )
}
