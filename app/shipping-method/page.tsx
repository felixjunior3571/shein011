"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Volume2, VolumeX, Plus, Minus } from "lucide-react"

export default function ShippingMethodPage() {
  const router = useRouter()
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [selectedPrice, setSelectedPrice] = useState<string>("")
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoVolume, setVideoVolume] = useState(0.35) // Volume inicial em 35%
  const [isMuted, setIsMuted] = useState(false)

  const shippingMethods = [
    {
      id: "pac",
      name: "PAC",
      price: "9,90",
      days: "8 a 12 dias úteis",
      description: "Entrega econômica",
    },
    {
      id: "sedex",
      name: "SEDEX",
      price: "15,90",
      days: "3 a 5 dias úteis",
      description: "Entrega rápida",
    },
    {
      id: "express",
      name: "SEDEX 10",
      price: "25,90",
      days: "1 a 2 dias úteis",
      description: "Entrega expressa",
    },
  ]

  // Função para definir volume do vídeo
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

        if (data.event === "ready") {
          setVideoLoaded(true)
          console.log("✅ Vídeo carregado e pronto!")

          // Define o volume para 35% quando o vídeo estiver pronto
          setTimeout(() => setVideoVolumeLevel(0.35), 100)
          setTimeout(() => setVideoVolumeLevel(0.35), 500)
          setTimeout(() => setVideoVolumeLevel(0.35), 1000)
        }

        if (data.event === "loaded") {
          console.log("📹 Vídeo totalmente carregado!")
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

  const handleMethodSelect = (method: any) => {
    setSelectedMethod(method.id)
    setSelectedPrice(method.price)
  }

  const handleContinue = () => {
    if (selectedMethod && selectedPrice) {
      // Salvar método e preço selecionados
      localStorage.setItem("selectedShippingMethod", selectedMethod)
      localStorage.setItem("selectedShippingPrice", selectedPrice)

      // Redirecionar para checkout
      router.push("/checkout")
    }
  }

  const adjustVolume = (change: number) => {
    const newVolume = Math.max(0, Math.min(1, videoVolume + change))
    setVideoVolume(newVolume)
    setVideoVolumeLevel(newVolume)
  }

  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    setVideoVolumeLevel(newMutedState ? 0 : videoVolume)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Escolha o Método de Entrega</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-6">
        {/* Video Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Conheça nossos métodos de entrega</h2>

          <div className="relative">
            <iframe
              src="https://player.vimeo.com/video/1037716413?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&loop=1&volume=0.35"
              width="100%"
              height="200"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
              className="rounded-lg"
              title="Métodos de Entrega SHEIN"
            ></iframe>

            {/* Volume Controls */}
            <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-black bg-opacity-50 rounded-lg p-1">
              <button
                onClick={() => adjustVolume(-0.1)}
                className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded"
              >
                <Minus className="w-3 h-3" />
              </button>

              <button onClick={toggleMute} className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => adjustVolume(0.1)}
                className="p-1 text-white hover:bg-white hover:bg-opacity-20 rounded"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {!videoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            </div>
          )}
        </div>

        {/* Shipping Methods */}
        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-bold text-gray-800">Escolha seu método de entrega</h2>

          {shippingMethods.map((method) => (
            <div
              key={method.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedMethod === method.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handleMethodSelect(method)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{method.name}</h3>
                    <span className="text-sm text-gray-500">({method.description})</span>
                  </div>
                  <p className="text-sm text-gray-600">{method.days}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-800">R$ {method.price}</p>
                </div>
              </div>

              {selectedMethod === method.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-black rounded-full flex items-center justify-center mr-2">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <span className="text-sm text-gray-600">Método selecionado</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedMethod}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors ${
            selectedMethod ? "bg-black hover:bg-gray-800" : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {selectedMethod ? `CONTINUAR - R$ ${selectedPrice}` : "SELECIONE UM MÉTODO"}
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>📦 Informação:</strong> O prazo de entrega começa a contar após a confirmação do pagamento.
          </p>
        </div>
      </div>
    </main>
  )
}
