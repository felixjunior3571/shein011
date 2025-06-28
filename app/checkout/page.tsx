"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, RefreshCw, Clock, CheckCircle } from "lucide-react"

export default function CheckoutPage() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutos em segundos
  const [pixCode, setPixCode] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [amount, setAmount] = useState("0,00")
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [paymentCompleted, setPaymentCompleted] = useState(false)

  useEffect(() => {
    // Carregar valor do método de entrega selecionado
    const selectedMethod = localStorage.getItem("selectedShippingMethod")
    const selectedPrice = localStorage.getItem("selectedShippingPrice")

    if (selectedPrice) {
      setAmount(selectedPrice)
    } else {
      setAmount("9,90") // Valor padrão
    }

    // Gerar código PIX simulado
    const generatePixCode = () => {
      const randomCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      return `00020126580014BR.GOV.BCB.PIX0136${randomCode}5204000053039865802BR5925SHEIN BRASIL LTDA6009SAO PAULO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    }

    const code = generatePixCode()
    setPixCode(code)

    // Gerar QR Code usando QuickChart
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(code)}&size=200`
    setQrCodeUrl(qrUrl)

    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Simular pagamento aprovado após 2 minutos
          setPaymentCompleted(true)
          setTimeout(() => {
            router.push("/success")
          }, 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Verificação periódica do pagamento (simulada)
    const checkPayment = setInterval(() => {
      setChecking(true)
      setTimeout(() => {
        setChecking(false)
      }, 1000)
    }, 10000) // Verifica a cada 10 segundos

    return () => {
      clearInterval(timer)
      clearInterval(checkPayment)
    }
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
    } catch (err) {
      console.error("Erro ao copiar:", err)
    }
  }

  if (paymentCompleted) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-green-600 mb-2">Pagamento Aprovado!</h1>
            <p className="text-gray-600 mb-4">Redirecionando...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Pagamento PIX</h1>
          <div className="flex items-center justify-center space-x-2">
            {checking && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-6">
        {/* Timer */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="text-lg font-bold text-orange-500">{formatTime(timeLeft)}</span>
          </div>
          <p className="text-sm text-gray-600 text-center">Tempo restante para pagamento</p>
        </div>

        {/* Amount */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Valor a pagar</p>
          <p className="text-3xl font-bold text-gray-800">R$ {amount}</p>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-center">Escaneie o QR Code</h2>
          <div className="flex justify-center mb-4">
            {qrCodeUrl && (
              <img
                src={qrCodeUrl || "/placeholder.svg"}
                alt="QR Code PIX"
                className="w-48 h-48 border border-gray-200 rounded-lg"
              />
            )}
          </div>
          <p className="text-sm text-gray-600 text-center">Abra o app do seu banco e escaneie o código</p>
        </div>

        {/* PIX Code */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Código PIX</h2>
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-mono text-gray-700 break-all leading-relaxed">{pixCode}</p>
          </div>
          <button
            onClick={copyPixCode}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
              copied ? "bg-green-500 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? "Código Copiado!" : "Copiar Código PIX"}</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Como pagar:</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. Abra o app do seu banco</li>
            <li>2. Escolha a opção PIX</li>
            <li>3. Escaneie o QR Code ou cole o código</li>
            <li>4. Confirme o pagamento</li>
          </ol>
        </div>
      </div>
    </main>
  )
}
