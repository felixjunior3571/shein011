"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Package, Truck, Gift, CheckCircle } from "lucide-react"

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
  const [selectedMethod, setSelectedMethod] = useState("")
  const [isGeneratingRate, setIsGeneratingRate] = useState(false)
  const [isRateGenerated, setIsRateGenerated] = useState(false)
  const [userAddress, setUserAddress] = useState<AddressData | null>(null)

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
    router.push("/final-confirmation")
  }

  // Encontra o método selecionado
  const selectedMethodDetails = shippingMethods.find((method) => method.id === selectedMethod)

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-4 py-8 sm:p-6 sm:py-12">
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
          <div className="bg-white rounded-lg shadow-md p-6">
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
                  <path d="M21 8H3" />
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
          // Tela de seleção de método de envio
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Title */}
            <h1 className="text-xl font-bold mb-3">Escolha o método de envio</h1>

            {/* Subtitle */}
            <p className="text-sm text-gray-600 mb-6">
              Agora basta escolher uma forma de envio do seu Cartão de Crédito{" "}
              <span className="font-semibold text-black">APROVADO</span>
            </p>

            {/* Shipping Methods */}
            <div className="space-y-3 mb-6">
              {shippingMethods.map((method) => {
                const IconComponent = method.icon
                return (
                  <div
                    key={method.id}
                    onClick={() => handleMethodSelect(method.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedMethod === method.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <IconComponent className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{method.name}</h3>
                          <p className="text-sm text-gray-600">{method.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
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
        )}
      </div>
    </main>
  )
}
