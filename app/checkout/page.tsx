"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, CheckCircle, Clock, RefreshCw } from "lucide-react"
import Image from "next/image"

export default function CheckoutPage() {
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutos em segundos
  const [pixCode, setPixCode] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [amount, setAmount] = useState("19.90")
  const router = useRouter()

  useEffect(() => {
    // Recupera o método de entrega selecionado
    const selectedMethod = localStorage.getItem("selectedShippingMethod")
    if (selectedMethod) {
      const method = JSON.parse(selectedMethod)
      setAmount(method.price)
    }

    // Gera código PIX simulado
    const generatePixCode = () => {
      const randomCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      return `00020126580014BR.GOV.BCB.PIX0136${randomCode}5204000053039865802BR5925SHEIN BRASIL LTDA6009SAO PAULO62070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    }

    const code = generatePixCode()
    setPixCode(code)

    // Gera QR Code usando QuickChart
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(code)}&size=200`
    setQrCodeUrl(qrUrl)
  }, [])

  useEffect(() => {
    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Simula pagamento aprovado após o tempo
          setPaymentCompleted(true)
          setTimeout(() => {
            router.push("/success")
          }, 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  useEffect(() => {
    // Verificação automática de pagamento (simulada)
    const checkPayment = setInterval(() => {
      if (!paymentCompleted && timeLeft > 0) {
        setChecking(true)
        setTimeout(() => {
          setChecking(false)
          // 10% de chance de "aprovar" o pagamento a cada verificação
          if (Math.random() < 0.1) {
            setPaymentCompleted(true)
            setTimeout(() => {
              router.push("/success")
            }, 2000)
          }
        }, 1000)
      }
    }, 10000) // Verifica a cada 10 segundos

    return () => clearInterval(checkPayment)
  }, [paymentCompleted, timeLeft, router])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const copyToClipboard = async () => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md mx-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento Aprovado!</h1>
          <p className="text-gray-600">Redirecionando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-lg font-bold text-orange-500">{formatTime(timeLeft)}</span>
              {checking && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
            </div>
            <h1 className="text-xl font-bold text-gray-800">Finalize seu pagamento</h1>
            <p className="text-gray-600 text-sm">Escaneie o QR Code ou copie o código PIX</p>
          </div>

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {amount}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
              {qrCodeUrl && (
                <Image
                  src={qrCodeUrl || "/placeholder.svg"}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  className="rounded"
                />
              )}
            </div>
          </div>

          {/* Código PIX */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">Código PIX:</p>
            <div className="bg-gray-100 p-3 rounded-lg border">
              <p className="text-xs text-gray-600 break-all font-mono">{pixCode}</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? "Copiado!" : "Copiar código PIX"}</span>
            </button>
          </div>

          {/* Instruções */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Como pagar:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Abra o app do seu banco</li>
              <li>2. Escolha a opção PIX</li>
              <li>3. Escaneie o QR Code ou cole o código</li>
              <li>4. Confirme o pagamento</li>
            </ol>
          </div>

          {/* Status */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">Aguardando confirmação do pagamento...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
