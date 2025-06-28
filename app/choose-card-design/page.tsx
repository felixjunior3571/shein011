"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import Image from "next/image"

// Função completa de abreviação de nomes para cartões
const abreviarNome = (nomeCompleto: string): string => {
  if (!nomeCompleto || typeof nomeCompleto !== "string") {
    return "USUÁRIO"
  }

  const nomes = nomeCompleto
    .trim()
    .split(" ")
    .filter((nome) => nome.length > 0)

  // Se o nome completo tem menos de 26 caracteres, usar completo
  if (nomeCompleto.length <= 26) {
    return nomeCompleto.toUpperCase()
  }

  // Lista de preposições e artigos que NÃO devem ser abreviados
  const naoAbreviar = ["da", "de", "di", "do", "du", "das", "dos", "e"]

  // Se tem mais de 26 caracteres, abreviar
  if (nomes.length >= 3) {
    // Primeiro nome + nomes do meio (abreviados ou completos) + último nome
    const primeiro = nomes[0]
    const ultimo = nomes[nomes.length - 1]

    const meios = nomes
      .slice(1, -1)
      .map((nome) => {
        // Se é uma preposição/artigo, manter completo
        if (naoAbreviar.includes(nome.toLowerCase())) {
          return nome.toLowerCase()
        }
        // Senão, abreviar
        return nome.charAt(0).toUpperCase()
      })
      .join(" ")

    const nomeAbreviado = `${primeiro} ${meios} ${ultimo}`.toUpperCase()

    // Se ainda está muito longo, fazer abreviação mais agressiva
    if (nomeAbreviado.length > 26) {
      const meiosAgressivos = nomes
        .slice(1, -1)
        .map((nome) => {
          // Manter preposições/artigos, mas abreviar tudo mais
          if (naoAbreviar.includes(nome.toLowerCase())) {
            return nome.toLowerCase()
          }
          return nome.charAt(0).toUpperCase()
        })
        .join(" ")

      return `${primeiro} ${meiosAgressivos} ${ultimo}`.toUpperCase()
    }

    return nomeAbreviado
  } else if (nomes.length === 2) {
    // Apenas primeiro e último nome
    return `${nomes[0]} ${nomes[1]}`.toUpperCase()
  } else {
    // Apenas um nome, truncar se necessário
    return nomes[0].substring(0, 26).toUpperCase()
  }
}

export default function ChooseCardDesignPage() {
  const searchParams = useSearchParams()
  const [cardColor, setCardColor] = useState("black")
  const [cardholderName, setCardholderName] = useState("Santos Silva")
  const [abbreviatedName, setAbbreviatedName] = useState("SANTOS SILVA")

  useEffect(() => {
    // Carregar nome do localStorage (dados do CPF)
    try {
      const cpfData = localStorage.getItem("cpfConsultaData")
      let fullName = "Santos Silva" // Nome padrão

      if (cpfData) {
        const dados = JSON.parse(cpfData)
        fullName = dados.nome || "Santos Silva"
        setCardholderName(fullName)
      }

      // Aplicar a função de abreviação
      const nomeFormatado = abreviarNome(fullName)
      setAbbreviatedName(nomeFormatado)

      console.log("Nome completo:", fullName)
      console.log("Nome abreviado:", nomeFormatado)
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error)
      setCardholderName("Santos Silva")
      setAbbreviatedName("SANTOS SILVA")
    }
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
                  <p className="font-medium text-sm" style={{ letterSpacing: "1px" }}>
                    {abbreviatedName}
                  </p>
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
              href="/delivery-method"
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
