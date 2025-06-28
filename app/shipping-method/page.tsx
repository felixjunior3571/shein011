"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePageTracking } from "@/hooks/use-tracking"
import { ChevronLeft, Volume2, VolumeX, Play, Pause } from "lucide-react"

export default function ShippingMethodPage() {
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState("")
  const [selectedPrice, setSelectedPrice] = useState(0)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoVolume, setVideoVolume] = useState(0.35) // Volume inicial em 35%
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  usePageTracking("shipping_method")

  const shippingMethods = [
    {
      id: "pac",
      name: "PAC",
      description: "Entrega em 8 a 12 dias úteis",
      price: 15.9,
      originalPrice: 25.9,
    },
    {
      id: "sedex",
      name: "SEDEX",
      description: "Entrega em 3 a 5 dias úteis",
      price: 25.9,
      originalPrice: 35.9,
    },
    {
      id: "express",
      name: "EXPRESSO",
      description: "Entrega em 1 a 2 dias úteis",
      price: 35.9,
      originalPrice: 45.9,
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

  // Listener para mensagens do Vimeo
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://player.vimeo.com") return

      try {
        const data = JSON.parse(event.data)
        console.log("📹 Evento do Vimeo:", data)

        if (data.event === "ready") {
          setVideoLoaded(true)
          console.log("✅ Vídeo carregado e pronto!")

          // Define o volume imediatamente quando pronto
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
          setTimeout(() => setVideoVolumeLevel(0.35), 500)
          setTimeout(() => setVideoVolumeLevel(0.35), 1000)
        }

        if (data.event === "loaded") {
          console.log("📹 Vídeo totalmente carregado!")
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
        }

        if (data.event === "play") {
          setIsPlaying(true)
          console.log("▶️ Vídeo iniciado!")
          // Garante volume baixo quando inicia
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
        }

        if (data.event === "pause") {
          setIsPlaying(false)
          console.log("⏸️ Vídeo pausado!")
        }

        if (data.event === "ended") {
          setIsPlaying(false)
          console.log("🏁 Vídeo finalizado!")
        }
      } catch (error) {
        console.error("Erro ao processar mensagem do Vimeo:", error)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const handleMethodSelect = (method: any) => {
    setSelectedMethod(method.id)
    setSelectedPrice(method.price)
    console.log("Método selecionado:", method)
  }

  const handleContinue = () => {
    if (!selectedMethod) return

    // Salva o método de entrega selecionado
    localStorage.setItem("selectedShippingMethod", selectedMethod)
    localStorage.setItem("selectedShippingPrice", selectedPrice.toString())

    console.log("Navegando para checkout com:", {
      method: selectedMethod,
      price: selectedPrice,
    })

    router.push("/checkout")
  }

  const togglePlayPause = () => {
    const iframe = document.querySelector("iframe")
    if (iframe && iframe.contentWindow) {
      const method = isPlaying ? "pause" : "play"
      iframe.contentWindow.postMessage(JSON.stringify({ method }), "https://player.vimeo.com")
    }
  }

  const toggleMute = () => {
    const iframe = document.querySelector("iframe")
    if (iframe && iframe.contentWindow) {
      const newVolume = isMuted ? videoVolume : 0
      setVideoVolumeLevel(newVolume)
      setIsMuted(!isMuted)
    }
  }

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, videoVolume + delta))
    setVideoVolume(newVolume)
    setVideoVolumeLevel(newVolume)
    setIsMuted(newVolume === 0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Escolha o método de entrega</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">Veja como funciona a entrega</h2>

          <div className="relative mb-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src="https://player.vimeo.com/video/1037913019?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&muted=0&volume=0.35"
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                title="Vídeo de entrega"
                className="w-full h-full"
              />
            </div>

            {/* Video Controls */}
            {videoLoaded && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <button
                  onClick={togglePlayPause}
                  className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="flex">
                  <button
                    onClick={() => adjustVolume(-0.1)}
                    className="bg-black/70 text-white px-2 py-1 rounded-l-full hover:bg-black/90 transition-colors text-xs"
                  >
                    -
                  </button>
                  <button
                    onClick={() => adjustVolume(0.1)}
                    className="bg-black/70 text-white px-2 py-1 rounded-r-full hover:bg-black/90 transition-colors text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 text-center">Nossos produtos são entregues com segurança e rapidez</p>
        </div>

        {/* Shipping Methods */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Métodos de entrega disponíveis</h3>

          <div className="space-y-3">
            {shippingMethods.map((method) => (
              <div
                key={method.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedMethod === method.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleMethodSelect(method)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        selectedMethod === method.id ? "border-black bg-black" : "border-gray-300"
                      }`}
                    >
                      {selectedMethod === method.id && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">{method.name}</h4>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 line-through">R$ {method.originalPrice.toFixed(2)}</span>
                      <span className="font-bold text-green-600">R$ {method.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedMethod}
          className={`w-full py-4 px-6 rounded-lg font-bold text-base transition-colors ${
            selectedMethod ? "bg-black text-white hover:bg-black/90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {selectedMethod ? "CONTINUAR" : "SELECIONE UM MÉTODO"}
        </button>

        {selectedMethod && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 text-center">
              ✅ Método selecionado: {shippingMethods.find((m) => m.id === selectedMethod)?.name} - R${" "}
              {selectedPrice.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
