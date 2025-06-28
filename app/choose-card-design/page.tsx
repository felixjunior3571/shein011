"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, Check } from "lucide-react"

export default function ChooseCardDesignPage() {
  const router = useRouter()
  const [selectedDesign, setSelectedDesign] = useState<string>("")
  const [userName, setUserName] = useState<string>("")

  // Função de abreviação de nomes para cartões
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

  useEffect(() => {
    // Carregar nome do localStorage
    try {
      const cpfData = localStorage.getItem("cpfConsultaData")
      if (cpfData) {
        const dados = JSON.parse(cpfData)
        const nomeFormatado = abreviarNome(dados.nome)
        setUserName(nomeFormatado)
      } else {
        setUserName("USUÁRIO")
      }
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error)
      setUserName("USUÁRIO")
    }
  }, [])

  const cardDesigns = [
    {
      id: "black",
      name: "Cartão Preto",
      image: "/shein-card-logo-new.png",
      bgColor: "bg-gradient-to-br from-gray-900 to-black",
      textColor: "text-white",
      description: "Design elegante e sofisticado",
    },
    {
      id: "gold",
      name: "Cartão Dourado",
      image: "/shein-card-logo.png",
      bgColor: "bg-gradient-to-br from-yellow-400 to-yellow-600",
      textColor: "text-black",
      description: "Design premium e exclusivo",
    },
  ]

  const handleContinue = () => {
    if (selectedDesign) {
      // Salvar design escolhido
      localStorage.setItem("selectedCardDesign", selectedDesign)

      // Redirecionar para a página do manager
      router.push("/manager")
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Escolha o Design do seu Cartão</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Personalize seu Cartão SHEIN</h2>
          <p className="text-gray-600 text-sm">Escolha o design que mais combina com você</p>
        </div>

        {/* Card Designs */}
        <div className="space-y-4 mb-8">
          {cardDesigns.map((design) => (
            <div
              key={design.id}
              className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedDesign === design.id ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedDesign(design.id)}
            >
              {/* Selection Indicator */}
              {selectedDesign === design.id && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Card Preview */}
              <div className={`${design.bgColor} rounded-lg p-4 mb-3 relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-8">
                  <Image
                    src={design.image || "/placeholder.svg"}
                    alt="SHEIN Logo"
                    width={60}
                    height={20}
                    className="object-contain"
                  />
                  <div className={`text-xs ${design.textColor} opacity-80`}>CRÉDITO</div>
                </div>

                <div className="space-y-2">
                  <div className={`text-lg font-mono ${design.textColor} tracking-wider`}>•••• •••• •••• 1234</div>
                  <div
                    className={`text-sm ${design.textColor} font-bold tracking-wide drop-shadow-sm`}
                    style={{ letterSpacing: "1px" }}
                  >
                    {userName}
                  </div>
                  <div className={`text-xs ${design.textColor} opacity-80`}>VÁLIDO ATÉ 12/29</div>
                </div>

                {/* Card chip */}
                <div className="absolute top-16 left-4 w-8 h-6 bg-yellow-400 rounded opacity-80"></div>
              </div>

              {/* Design Info */}
              <div>
                <h3 className="font-semibold text-gray-800">{design.name}</h3>
                <p className="text-sm text-gray-600">{design.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          disabled={!selectedDesign}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-colors ${
            selectedDesign ? "bg-black hover:bg-gray-800" : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          CONTINUAR
        </button>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Dica:</strong> Você poderá alterar o design do seu cartão a qualquer momento através do app
            SHEIN.
          </p>
        </div>
      </div>
    </main>
  )
}
