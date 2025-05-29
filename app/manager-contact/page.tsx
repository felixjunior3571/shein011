"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ManagerContactPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")

  // Função para formatar WhatsApp
  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")

    // Aplica a máscara (00) 00000-0000
    if (numbers.length <= 2) {
      return numbers
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formattedValue = formatWhatsApp(value)
    setWhatsapp(formattedValue)
  }

  const handleContinue = () => {
    // Salva o WhatsApp no localStorage se necessário
    if (whatsapp) {
      localStorage.setItem("customerWhatsApp", whatsapp)
    }

    // Redireciona para a página de endereço de entrega
    router.push("/delivery-address")
  }

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-4 text-gray-900">Ótimo, quase lá !</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-8 leading-relaxed">
            Antes de escolher uma forma de envio, conheça sua Gerente Responsável:
          </p>

          {/* Manager Section */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            {/* Manager Photo */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-wVlQJ7vqmO78o5bB6HCB6KYFENCKrW.png"
                    alt="Juliana Benedito - Gerente"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center" }}
                  />
                </div>
              </div>
            </div>

            {/* Manager Info */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Gerente</p>
              <h3 className="text-xl font-bold text-black mb-3">Juliana Benedito</h3>

              {/* Badge */}
              <div className="inline-flex items-center bg-gray-200 rounded-full px-3 py-1">
                <span className="text-sm">🏆 Melhor gerente 2023-2024</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-center text-gray-700 mb-6 leading-relaxed">
            Após concluir o procedimento, Juliana entrará em contato para garantir um atendimento humanizado sempre que
            você precisar.
          </p>

          {/* WhatsApp Input */}
          <div className="mb-6">
            <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-2">
              Digite seu WhatsApp
            </label>
            <input
              type="tel"
              id="whatsapp"
              value={whatsapp}
              onChange={handleWhatsAppChange}
              placeholder="(00) 00000-0000"
              maxLength={15}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-black text-base"
            />
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={whatsapp.length < 14} // Mínimo para um número válido
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors text-base ${
              whatsapp.length >= 14
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </main>
  )
}
