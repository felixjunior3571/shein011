"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

// Função para abreviar o nome do titular de forma inteligente
const abbreviateName = (fullName: string): string => {
  if (!fullName) return "Santos Silva"

  const words = fullName.trim().split(" ")

  if (words.length <= 2) {
    return fullName
  }

  // Preposições que não devem ser abreviadas
  const prepositions = ["DE", "DA", "DOS", "DAS", "DO", "DI", "E"]

  const firstName = words[0]
  const lastName = words[words.length - 1]
  const middleNames = words.slice(1, -1)

  // Processa os nomes do meio
  const processedMiddleNames = middleNames.map((name) => {
    // Se for uma preposição, mantém completa
    if (prepositions.includes(name.toUpperCase())) {
      return name
    }
    // Se não for preposição, abrevia para primeira letra sem ponto
    return name.charAt(0).toUpperCase()
  })

  const result = [firstName, ...processedMiddleNames, lastName].join(" ")

  // Se ainda estiver muito longo, faz uma abreviação mais agressiva
  if (result.length > 20) {
    // Mantém apenas primeiro nome, preposições importantes e último nome
    const importantMiddle = middleNames.filter((name) => prepositions.includes(name.toUpperCase()))
    return [firstName, ...importantMiddle, lastName].join(" ")
  }

  return result
}

export default function ChooseCardDesignPage() {
  const searchParams = useSearchParams()
  const [cardColor, setCardColor] = useState("black")
  const [cardholderName, setCardholderName] = useState("Santos Silva")
  const [abbreviatedName, setAbbreviatedName] = useState("Santos Silva")

  useEffect(() => {
    // Try to get the name from localStorage first, then URL params
    const nameFromStorage = typeof window !== "undefined" ? localStorage.getItem("cardholderName") : null
    const nameFromParams = searchParams.get("name")

    let fullName = "Santos Silva" // Nome padrão

    if (nameFromStorage) {
      fullName = nameFromStorage
      setCardholderName(nameFromStorage)
    } else if (nameFromParams) {
      fullName = nameFromParams
      setCardholderName(nameFromParams)
      // Save to localStorage for future use
      if (typeof window !== "undefined") {
        localStorage.setItem("cardholderName", nameFromParams)
      }
    }

    // Abrevia o nome para exibição no cartão
    const abbreviated = abbreviateName(fullName)
    setAbbreviatedName(abbreviated)

    console.log("Nome completo:", fullName)
    console.log("Nome abreviado:", abbreviated)
  }, [searchParams])

  const colors = [
    { name: "black", bg: "bg-black", border: "border-black" },
    { name: "navy", bg: "bg-[#1f2937]", border: "border-[#1f2937]" },
    { name: "gray", bg: "bg-gray-400", border: "border-gray-400" },
    { name: "pink", bg: "bg-pink-400", border: "border-pink-400" },
  ]

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-4">Escolha o design do seu cartão</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-8">Selecione o estilo que mais combina com você</p>

          {/* Color Selection */}
          <div className="mb-6">
            <p className="text-center font-medium mb-4">Escolha a cor do seu cartão</p>
            <div className="flex justify-center gap-6 mb-8">
              {colors.map((color) => (
                <button
                  key={color.name}
                  className={`w-12 h-12 rounded-full ${color.bg} border-2 ${
                    cardColor === color.name ? "ring-2 ring-offset-2 ring-black" : ""
                  }`}
                  onClick={() => setCardColor(color.name)}
                  aria-label={`Cor ${color.name}`}
                />
              ))}
            </div>
          </div>

          {/* Card Preview */}
          <div className="flex justify-center mb-8">
            <div
              className={`w-full max-w-xs aspect-[1.6/1] rounded-xl p-5 text-white relative overflow-hidden ${
                cardColor === "black"
                  ? "bg-black"
                  : cardColor === "navy"
                    ? "bg-[#1f2937]"
                    : cardColor === "gray"
                      ? "bg-gray-400"
                      : "bg-pink-400"
              }`}
            >
              {/* Card content */}
              <div className="flex justify-between items-start mb-6">
                <div className="h-6 w-16 relative">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Jvn6YKdyIgVtezbSZjrTlgihNrlP0U.png"
                    alt="Logo"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>

                {/* Payment Network Logo - Using the provided image */}
                <div className="h-6 w-16 relative">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-udB1O2tcn9cL5FDEfDtioM9EIEYHFe.png"
                    alt="Bandeira do cartão"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 mb-8">
                {/* Chip */}
                <div className="w-10 h-8 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-md relative overflow-hidden">
                  <div className="absolute inset-0.5 grid grid-cols-4 grid-rows-3 gap-0.5">
                    {Array(12)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="bg-yellow-600/80 rounded-sm"></div>
                      ))}
                  </div>
                </div>

                {/* NFC Symbol */}
                <div className="w-6 h-6 relative">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9.5 8.5C9.5 8.5 11 7 12 7C13 7 14.5 8.5 14.5 8.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7.5 6.5C7.5 6.5 10 4 12 4C14 4 16.5 6.5 16.5 6.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5.5 4.5C5.5 4.5 9 1 12 1C15 1 18.5 4.5 18.5 4.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.5 11C11.5 11 12 10 12 10C12 10 12.5 11 12.5 11"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs opacity-80 mb-1">TITULAR DO CARTÃO</p>
                  <p className="font-medium text-sm">{abbreviatedName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80 mb-1">VÁLIDO ATÉ</p>
                  <p className="font-medium">01/32</p>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-end">
            <Link
              href="/manager"
              className="bg-black text-white rounded-lg px-6 py-3 text-center font-medium hover:bg-black/90 transition-colors"
            >
              CONTINUAR
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
