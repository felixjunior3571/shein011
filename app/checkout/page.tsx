"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Copy, RefreshCw, Clock } from "lucide-react"
import { usePageTracking } from "@/hooks/use-tracking"

// Função para abreviar nomes conforme especificação
const abreviarNome = (nomeCompleto: string): string => {
  if (!nomeCompleto) return "SANTOS SILVA"

  const nomes = nomeCompleto.trim().split(" ")

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

export default function CheckoutPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutos em segundos
  const [pixCode, setPixCode] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [amount, setAmount] = useState(0)
  const [cardholderName, setCardholderName] = useState("SANTOS SILVA")
  const [shippingMethod, setShippingMethod] = useState("")
  const [checking, setChecking] = useState(false)
  const [copied, setCopied] = useState(false)

  usePageTracking("checkout")

  useEffect(() => {
    // Recupera dados do localStorage
    const savedAmount = localStorage.getItem("selectedShippingPrice")
    const savedMethod = localStorage.getItem("selectedShippingMethod")
    const savedName = localStorage.getItem("cardholderName")

    if (savedAmount) {
      setAmount(Number.parseFloat(savedAmount))
    }
    if (savedMethod) {
      setShippingMethod(savedMethod.toUpperCase())
    }
    if (savedName) {
      const nomeAbreviado = abreviarNome(savedName)
      setCardholderName(nomeAbreviado)
    }

    // Gera PIX simulado
    const simulatedPixCode = `00020126580014BR.GOV.BCB.PIX0136${Math.random().toString(36).substring(2, 15)}520400005303986540${savedAmount || "25.90"}5802BR5925SHEIN BRASIL LTDA6009SAO PAULO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    setPixCode(simulatedPixCode)

    // Gera QR Code usando QuickChart
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(simulatedPixCode)}&size=200`
    setQrCodeUrl(qrUrl)

    console.log("Checkout iniciado:", {
      amount: savedAmount,
      method: savedMethod,
      name: savedName,
      abbreviated: abreviarNome(savedName || ""),
    })
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      // Simula pagamento aprovado após 2 minutos
      console.log("Tempo esgotado - simulando pagamento aprovado")
      router.push("/success")
    }
  }, [timeLeft, router])

  // Simula verificação de pagamento
  useEffect(() => {
    const interval = setInterval(() => {
      setChecking(true)
      setTimeout(() => {
        setChecking(false)
        // Simula chance de pagamento (5% a cada verificação)
        if (Math.random() < 0.05) {
          console.log("Pagamento simulado como aprovado")
          router.push("/success")
        }
      }, 1000)
    }, 10000) // Verifica a cada 10 segundos

    return () => clearInterval(interval)
  }, [router])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      console.log("Código PIX copiado")
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  const getMethodName = (method: string) => {
    switch (method.toLowerCase()) {
      case "pac":
        return "PAC"
      case "sedex":
        return "SEDEX"
      case "express":
        return "EXPRESSO"
      default:
        return method
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => router.back()} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">Pagamento</h1>
          </div>
          <div className="flex items-center justify-center space-x-2">
            {checking && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6">
        {/* Timer */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-5 h-5 text-red-600" />
            <span className="text-red-600 font-bold text-lg">{formatTime(timeLeft)}</span>
          </div>
          <p className="text-red-600 text-sm text-center mt-1">Tempo restante para pagamento</p>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-center">Finalize seu pagamento</h2>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Cartão para:</span>
              <span className="font-semibold">{cardholderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Entrega:</span>
              <span className="font-semibold">{getMethodName(shippingMethod)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">R$ {amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code com seu app do banco</p>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                {qrCodeUrl && <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code PIX" className="w-48 h-48" />}
              </div>
            </div>
          </div>

          {/* PIX Code */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2 text-center">Ou copie o código PIX:</p>
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-700 truncate flex-1 mr-2">
                  {pixCode.substring(0, 50)}...
                </span>
                <button
                  onClick={copyPixCode}
                  className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
                    copied ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">Após o pagamento, você será redirecionado automaticamente</p>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🔒 Pagamento Seguro</h3>
          <p className="text-blue-700 text-sm">
            Seus dados estão protegidos e o pagamento é processado de forma segura.
          </p>
        </div>
      </div>
    </div>
  )
}
