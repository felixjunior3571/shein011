"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useTracking } from "@/hooks/use-tracking"

// Função para construir URL com parâmetros
const buildCheckoutUrl = (baseUrl: string, params: Record<string, string>) => {
  const url = new URL(baseUrl, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

export default function ManagerPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState("")
  const { trackEvent } = useTracking()

  const formatWhatsApp = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, "")

    // Apply Brazilian phone number formatting
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

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsApp(e.target.value)
    setWhatsapp(formatted)
  }

  const handleContinue = () => {
    if (whatsapp.length >= 14) {
      // Save WhatsApp to localStorage
      localStorage.setItem("userWhatsApp", whatsapp)

      // Atualiza dados do checkout com telefone
      const existingCheckoutData = JSON.parse(localStorage.getItem("checkoutData") || "{}")
      const updatedCheckoutData = {
        ...existingCheckoutData,
        telephone: whatsapp,
      }
      localStorage.setItem("checkoutData", JSON.stringify(updatedCheckoutData))

      // Atualiza URL do checkout com telefone
      const checkoutParams = {
        document: updatedCheckoutData.document || "",
        name: updatedCheckoutData.name || "",
        telephone: encodeURIComponent(whatsapp), // Codifica o telefone para URL
      }
      const checkoutUrl = buildCheckoutUrl("/checkout", checkoutParams)
      localStorage.setItem("checkoutUrl", checkoutUrl)

      console.log("Dados do checkout atualizados:", updatedCheckoutData)
      console.log("URL do checkout final:", checkoutUrl)

      // Track event
      trackEvent({
        event: "manager_whatsapp_provided",
        whatsapp: whatsapp,
        page: "manager",
      })

      // Navigate to delivery method
      router.push("/delivery-method")
    }
  }

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-3">Ótimo, quase lá!</h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Conheça sua Gerente, ela irá auxiliar na ativação do seu cartão e esclarecer todas as suas dúvidas!
            </p>
          </div>

          {/* Manager Card */}
          <div className="border-2 border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
            {/* Manager Photo */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                <div className="w-full h-full rounded-full border-4 border-black overflow-hidden">
                  <Image
                    src="/manager-profile.png"
                    alt="Ana Nogueira - Gerente"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Manager Info */}
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Gerente</p>
              <h2 className="text-xl font-bold text-black mb-3">Ana Nogueira</h2>

              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L13 8h6l-5 4 2 6-6-4-6 4 2-6-5-4h6l3-6z" clipRule="evenodd" />
                </svg>
                Melhor gerente 2023-2025
              </div>
            </div>
          </div>

          {/* WhatsApp Input */}
          <div className="mb-6">
            <div className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                </svg>
              </div>
              <input
                type="tel"
                value={whatsapp}
                onChange={handleWhatsAppChange}
                placeholder="Digite seu WhatsApp aqui"
                className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-500"
                maxLength={15}
              />
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={whatsapp.length < 14}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
              whatsapp.length >= 14
                ? "bg-black text-white hover:bg-gray-800"
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
