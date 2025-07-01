"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTracking } from "@/hooks/use-tracking"

export default function ShippingMethodPage() {
  const router = useRouter()
  const { trackEvent, trackShippingSelection } = useTracking()
  const [selectedMethod, setSelectedMethod] = useState<string>("")
  const [isGeneratingRate, setIsGeneratingRate] = useState(false)
  const [videoStarted, setVideoStarted] = useState(false)

  useEffect(() => {
    // Track page view
    trackEvent("shipping_method_page_view", {
      step: "shipping_method",
      page: "/shipping-method",
    })
  }, [trackEvent])

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method)
    trackEvent("shipping_method_selected", {
      method: method,
      step: "shipping_method",
    })
  }

  const handleContinue = async () => {
    if (!selectedMethod) {
      alert("Por favor, selecione um método de envio")
      return
    }

    setIsGeneratingRate(true)

    trackEvent("shipping_continue_clicked", {
      selected_method: selectedMethod,
      step: "shipping_method",
    })

    try {
      // Simula geração da taxa
      await new Promise((resolve) => setTimeout(resolve, 2000))

      trackShippingSelection(selectedMethod, getMethodPrice(selectedMethod))

      // Redireciona para a página de pagamento correspondente
      router.push(`/payment/${selectedMethod.toLowerCase()}`)
    } catch (error) {
      console.error("Erro ao gerar taxa:", error)
      setIsGeneratingRate(false)
    }
  }

  const getMethodPrice = (method: string) => {
    switch (method) {
      case "SEDEX":
        return "34,90"
      case "EXPRESS":
        return "29,58"
      case "PAC":
        return "27,97"
      default:
        return "0,00"
    }
  }

  const handleVideoStart = () => {
    if (!videoStarted) {
      setVideoStarted(true)
      trackEvent("shipping_video_started", {
        step: "shipping_method",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Método de Envio</h1>
          <p className="text-gray-600">Escolha como deseja receber seu cartão</p>
        </div>

        {/* Video Section */}
        <div className="relative">
          <video
            className="w-full rounded-lg shadow-md"
            controls
            poster="/placeholder.svg?height=200&width=400"
            onPlay={handleVideoStart}
          >
            <source src="/videos/emprestimo-facilitado.mp4" type="video/mp4" />
            Seu navegador não suporta o elemento de vídeo.
          </video>
        </div>

        {/* Shipping Methods */}
        <div className="space-y-3">
          {/* SEDEX */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === "SEDEX" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handleMethodSelect("SEDEX")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">📦</div>
                <div>
                  <h3 className="font-semibold text-gray-900">SEDEX</h3>
                  <p className="text-sm text-gray-600">1 dia útil</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">R$ 34,90</p>
              </div>
            </div>
          </div>

          {/* EXPRESS */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === "EXPRESS" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handleMethodSelect("EXPRESS")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">🚚</div>
                <div>
                  <h3 className="font-semibold text-gray-900">EXPRESS</h3>
                  <p className="text-sm text-gray-600">5 dias úteis</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">R$ 29,58</p>
              </div>
            </div>
          </div>

          {/* PAC */}
          <div
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === "PAC" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handleMethodSelect("PAC")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">🎁</div>
                <div>
                  <h3 className="font-semibold text-gray-900">PAC</h3>
                  <p className="text-sm text-gray-600">10 dias úteis</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-green-600">R$ 27,97</p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedMethod || isGeneratingRate}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
            selectedMethod && !isGeneratingRate ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {isGeneratingRate ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Gerando taxa...</span>
            </div>
          ) : (
            "Continuar"
          )}
        </button>

        {/* Selected Method Info */}
        {selectedMethod && (
          <div className="text-center text-sm text-gray-600">
            Método selecionado: <span className="font-semibold">{selectedMethod}</span> - R${" "}
            {getMethodPrice(selectedMethod)}
          </div>
        )}
      </div>
    </div>
  )
}
