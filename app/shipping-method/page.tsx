"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Truck, Gift, CheckCircle, Play } from "lucide-react"
import { usePageTracking, useTracking } from "@/hooks/use-tracking"

interface AddressData {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  complement?: string
}

export default function ShippingMethodPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { trackShippingSelection } = useTracking()
  const [selectedMethod, setSelectedMethod] = useState("")
  const [isGeneratingRate, setIsGeneratingRate] = useState(false)
  const [isRateGenerated, setIsRateGenerated] = useState(false)
  const [userAddress, setUserAddress] = useState<AddressData | null>(null)
  const [videoEnded, setVideoEnded] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoStarted, setVideoStarted] = useState(false)
  const [videoVolume, setVideoVolume] = useState(0.5) // Volume inicial em 50%

  // Detectar se é mobile
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      )
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Rastreia a página de método de envio
  usePageTracking("shipping_method")

  // Recupera o endereço do localStorage quando a página carrega
  useEffect(() => {
    // Tenta obter o endereço do localStorage
    const savedAddress = localStorage.getItem("deliveryAddress")

    if (savedAddress) {
      setUserAddress(JSON.parse(savedAddress))
    } else {
      // Endereço padrão caso não exista no localStorage
      setUserAddress({
        street: "Rua Marquês de São Vicente",
        number: "41",
        neighborhood: "Gávea",
        city: "Rio de Janeiro",
        state: "RJ",
        zipCode: "22451041",
      })
    }
  }, [])

  // Listener para eventos do Vimeo com debug melhorado
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

          // Define o volume para 50% quando o vídeo estiver pronto
          const iframe = document.querySelector("iframe")
          if (iframe && iframe.contentWindow) {
            setTimeout(() => {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  method: "setVolume",
                  value: 0.5,
                }),
                "https://player.vimeo.com",
              )
            }, 1000)
          }
        }

        if (data.event === "play") {
          setVideoStarted(true)
          console.log("▶️ Vídeo iniciou!")
        }

        if (data.event === "ended") {
          setVideoEnded(true)
          console.log("🎬 Vídeo terminou!")
        }

        if (data.event === "loaded") {
          console.log("📹 Vídeo foi carregado completamente")
        }
      } catch (error) {
        console.log("Erro ao processar evento Vimeo:", error)
      }
    }

    // Timer automático para mostrar mensagem após 1:11 (71 segundos)
    const autoTimer = setTimeout(() => {
      setVideoEnded(true)
      console.log("⏰ Timer automático: Vídeo considerado concluído após 1:11")
    }, 71000) // 71 segundos = 1 minuto e 11 segundos

    window.addEventListener("message", handleMessage)

    return () => {
      window.removeEventListener("message", handleMessage)
      clearTimeout(autoTimer)
    }
  }, [])

  // Métodos de envio com preços corretos
  const shippingMethods = [
    {
      id: "sedex",
      name: "SEDEX",
      duration: "1 dia útil",
      price: "R$ 34,90",
      numericPrice: 34.9,
      icon: Package,
      paymentUrl: "/payment/sedex",
    },
    {
      id: "express",
      name: "EXPRESS",
      duration: "5 dias úteis",
      price: "R$ 29,58",
      numericPrice: 29.58,
      icon: Truck,
      paymentUrl: "/payment/express",
    },
    {
      id: "pac",
      name: "PAC",
      duration: "10 dias úteis",
      price: "R$ 27,97",
      numericPrice: 27.97,
      icon: Gift,
      paymentUrl: "/payment/pac",
    },
  ]

  const handleMethodSelect = (methodId: string) => {
    if (methodId === selectedMethod && isRateGenerated) return

    setSelectedMethod(methodId)
    setIsGeneratingRate(true)
    setIsRateGenerated(false)

    // Encontra o método selecionado
    const method = shippingMethods.find((m) => m.id === methodId)

    if (method) {
      // Rastreia a seleção do método de envio
      trackShippingSelection(method.name, method.price)

      // Salva o método completo no localStorage
      localStorage.setItem("selectedShippingMethod", JSON.stringify(method))
      console.log("Método salvo:", method) // Debug log
    }

    // Simula o tempo de geração da taxa
    setTimeout(() => {
      setIsGeneratingRate(false)
      setIsRateGenerated(true)
    }, 2000)
  }

  const handleConfirm = () => {
    // Redireciona para a página de provas sociais em vez da confirmação final
    router.push("/social-proof")
  }

  // Função para ajustar volume
  const adjustVolume = (newVolume: number) => {
    const iframe = document.querySelector("iframe")
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          method: "setVolume",
          value: newVolume,
        }),
        "https://player.vimeo.com",
      )
      setVideoVolume(newVolume)
    }
  }

  // Encontra o método selecionado
  const selectedMethodDetails = shippingMethods.find((method) => method.id === selectedMethod)

  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-4xl mx-auto p-4">
        {isGeneratingRate ? (
          // Tela de carregamento
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-amber-600 font-medium mb-6">
              Gerando a Taxa de Correios - {selectedMethodDetails?.name}...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          </div>
        ) : isRateGenerated && userAddress ? (
          // Tela de taxa gerada com sucesso
          <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
            {/* Mensagem de sucesso */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 flex items-center">
              <CheckCircle className="text-green-600 w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-green-700 font-medium">Taxa de envio gerada com sucesso!</span>
            </div>

            {/* Detalhes do envio */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <h2 className="font-semibold text-lg mb-3">Detalhes do Envio</h2>

              <div className="border-b pb-3 mb-3">
                <p className="font-medium">Endereço de entrega:</p>
                <p className="text-sm">
                  {userAddress.street}, {userAddress.number}
                </p>
                {userAddress.complement && <p className="text-sm">{userAddress.complement}</p>}
                <p className="text-sm">{userAddress.neighborhood}</p>
                <p className="text-sm">
                  {userAddress.city}-{userAddress.state}
                </p>
                <p className="text-sm">CEP: {userAddress.zipCode}</p>
              </div>

              <div className="border-b pb-3 mb-3">
                <p className="font-medium">Método de envio:</p>
                <p className="text-sm font-semibold">{selectedMethodDetails?.name}</p>
                <p className="text-sm font-bold text-green-600">{selectedMethodDetails?.price}</p>
                <p className="text-sm">{selectedMethodDetails?.duration}</p>
                <p className="text-sm text-gray-600">Taxa única de envio • Rastreamento online</p>
              </div>

              <div>
                <p className="font-medium">Início do envio:</p>
                <p className="text-sm">Hoje iniciaremos o procedimento de envio em até 2 horas.</p>
              </div>
            </div>

            {/* Cartão virtual */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="font-semibold flex items-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 flex-shrink-0"
                >
                  <rect width="18" height="14" x="3" y="5" rx="2" />
                  <path d="M7 15h.01" />
                  <path d="M11 15h2" />
                </svg>
                Cartão Virtual Disponível Hoje
              </p>
              <p className="text-sm">
                Você receberá hoje seu cartão virtual com limite de R$ 11.700 para começar a usar imediatamente,
                enquanto seu cartão físico está a caminho.
              </p>
            </div>

            {/* Botão de confirmação */}
            <button
              onClick={handleConfirm}
              className="w-full bg-black text-white font-bold py-3 px-4 rounded-md hover:bg-black/90 transition-colors"
            >
              SIM, VOU QUERER!
            </button>
          </div>
        ) : (
          // Tela principal com vídeo e seleção de método de envio
          <div className="flex flex-col items-center justify-center text-center space-y-8">
            {/* Instrução para reproduzir o vídeo */}
            {videoLoaded && !videoStarted && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 max-w-2xl mx-auto shadow-md animate-bounce">
                <div className="flex items-center justify-center space-x-3">
                  <div className="bg-blue-500 rounded-full p-2">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-blue-800 font-bold text-lg">👆 Toque no vídeo para reproduzir</p>
                    <p className="text-blue-700 text-sm">
                      Assista ao vídeo explicativo antes de escolher o método de envio
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Container do Vídeo com Loading */}
            <div className="w-full max-w-3xl px-4">
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                {/* Loading do vídeo */}
                {!videoLoaded && (
                  <div className="absolute inset-0 bg-gray-100 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600 font-medium">Carregando vídeo...</p>
                    </div>
                  </div>
                )}

                {/* Iframe do Vimeo - sempre com som habilitado */}
                <iframe
                  src="https://player.vimeo.com/video/1091329936?h=77a25f5325&autoplay=1&muted=0&controls=1&title=0&byline=0&portrait=0&background=0&loop=0&api=1&autopause=0&quality=auto&playsinline=1"
                  className={`absolute top-0 left-0 w-full h-full transition-opacity duration-500 ${
                    videoLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Vídeo Explicativo"
                  loading="eager"
                />

                {/* Controles de volume */}
                {videoLoaded && videoStarted && (
                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                    {/* Botão de volume alto */}
                    <button
                      onClick={() => adjustVolume(1)}
                      className={`p-2 rounded-full transition-colors ${
                        videoVolume === 1 ? "bg-blue-600 text-white" : "bg-black/70 text-white hover:bg-black/90"
                      }`}
                      title="Volume Alto"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.414 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.414l3.969-3.816a1 1 0 011.617.816zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.984 3.984 0 00-1.172-2.828 1 1 0 010-1.415z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    {/* Botão de volume médio (50%) */}
                    <button
                      onClick={() => adjustVolume(0.5)}
                      className={`p-2 rounded-full transition-colors ${
                        videoVolume === 0.5 ? "bg-blue-600 text-white" : "bg-black/70 text-white hover:bg-black/90"
                      }`}
                      title="Volume Médio (50%)"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.414 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.414l3.969-3.816a1 1 0 011.617.816zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                        <text x="10" y="14" fontSize="8" textAnchor="middle" fill="currentColor">
                          50%
                        </text>
                      </svg>
                    </button>

                    {/* Botão de mudo */}
                    <button
                      onClick={() => adjustVolume(0)}
                      className={`p-2 rounded-full transition-colors ${
                        videoVolume === 0 ? "bg-red-600 text-white" : "bg-black/70 text-white hover:bg-black/90"
                      }`}
                      title="Mudo"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.414 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.414l3.969-3.816a1 1 0 011.617.816zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Status do vídeo */}
            {videoStarted && !videoEnded && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 max-w-md mx-auto">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  <p className="text-yellow-800 font-medium text-sm">Assistindo vídeo explicativo...</p>
                </div>
              </div>
            )}

            {/* Observação após o vídeo terminar - RESPONSIVO */}
            {videoEnded && (
              <div className="bg-green-100 border-2 border-green-400 rounded-lg p-3 sm:p-6 max-w-xs sm:max-w-2xl mx-auto shadow-lg animate-pulse">
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  <div className="bg-green-500 rounded-full p-1 sm:p-2">
                    <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-green-800 font-bold text-sm sm:text-lg">VÍDEO CONCLUÍDO!</p>
                    <p className="text-green-700 text-xs sm:text-sm">Agora escolha o método de entrega ⬇️</p>
                  </div>
                </div>
              </div>
            )}

            {/* Título */}
            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-gray-900 px-4">ESCOLHA O MÉTODO DE ENVIO</h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-lg text-gray-600 mb-8 px-4">
              Agora basta escolher uma forma de envio do seu Cartão de Crédito{" "}
              <span className="font-semibold text-black">APROVADO</span>
            </p>

            {/* Container dos métodos de envio */}
            <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6">
              {/* Shipping Methods */}
              <div className="space-y-3 mb-6">
                {shippingMethods.map((method) => {
                  const IconComponent = method.icon
                  return (
                    <div
                      key={method.id}
                      onClick={() => handleMethodSelect(method.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all w-full ${
                        selectedMethod === method.id
                          ? "border-black bg-gray-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-shrink-0">
                            <IconComponent className="w-8 h-8 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-left">{method.name}</h3>
                            <p className="text-sm text-gray-600 text-left">{method.duration}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-lg text-green-600">{method.price}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Continue Button */}
              <button
                onClick={() => selectedMethod && handleMethodSelect(selectedMethod)}
                disabled={!selectedMethod}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  selectedMethod
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
