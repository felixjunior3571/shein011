"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Clock, Copy, CheckCircle, RefreshCw, AlertCircle } from "lucide-react"
import Image from "next/image"

interface PaymentData {
  invoiceId: string
  qrcode: string
  qrCodeUrl: string
  amount: number
  description: string
  expiresAt: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [error, setError] = useState("")
  const [copySuccess, setCopySuccess] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Pega os dados do método de envio selecionado
  const getShippingData = () => {
    const savedMethod = localStorage.getItem("selectedShippingMethod")
    if (savedMethod) {
      try {
        return JSON.parse(savedMethod)
      } catch (error) {
        console.error("Erro ao recuperar método de envio:", error)
      }
    }

    // Fallback baseado nos parâmetros da URL
    const method = searchParams.get("method") || "sedex"
    const methodData = {
      sedex: { name: "SEDEX", price: "R$ 34,90", numericPrice: 34.9 },
      express: { name: "EXPRESS", price: "R$ 29,58", numericPrice: 29.58 },
      pac: { name: "PAC", price: "R$ 27,97", numericPrice: 27.97 },
    }

    return methodData[method] || methodData.sedex
  }

  // Pega dados do cliente
  const getCustomerData = () => {
    const savedName = localStorage.getItem("cardholderName") || "Cliente"
    const savedEmail = localStorage.getItem("userEmail") || "cliente@email.com"
    const savedCpf = localStorage.getItem("userCpf") || ""

    return {
      name: savedName,
      email: savedEmail,
      phone: "",
      document: savedCpf.replace(/\D/g, ""),
    }
  }

  // Cria a fatura PIX
  const createInvoice = async () => {
    try {
      setIsLoading(true)
      setError("")

      const shippingData = getShippingData()
      const customerData = getCustomerData()

      console.log("Criando fatura para:", shippingData)

      const response = await fetch("/api/tryplopay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: shippingData.numericPrice,
          description: `Frete ${shippingData.name} - Cartão SHEIN`,
          customerData: customerData,
          externalId: `shipping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar fatura")
      }

      console.log("Fatura criada:", result)

      setPaymentData(result)

      // Salva no localStorage
      localStorage.setItem("currentInvoiceId", result.invoiceId)
      localStorage.setItem("qrcode", result.qrcode)
      localStorage.setItem("qrCodeUrl", result.qrCodeUrl)
      localStorage.setItem("paymentAmount", result.amount.toString())
      localStorage.setItem("paymentDescription", result.description)

      // Inicia verificação automática
      startPaymentVerification(result.invoiceId)
    } catch (error) {
      console.error("Erro ao criar fatura:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Verifica status do pagamento
  const checkPaymentStatus = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/tryplopay/payment-status?invoiceId=${invoiceId}`)
      const result = await response.json()

      console.log("Status do pagamento:", result)

      if (
        result.success &&
        (result.status === "paid" || result.status === "approved" || result.status === "completed")
      ) {
        console.log("✅ Pagamento aprovado!")

        // Para verificação automática
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }

        // Redireciona para página de sucesso
        router.push("/success")
        return true
      }

      return false
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error)
      return false
    }
  }

  // Inicia verificação automática
  const startPaymentVerification = (invoiceId: string) => {
    // Limpa intervalo anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Verifica a cada 10 segundos
    intervalRef.current = setInterval(() => {
      checkPaymentStatus(invoiceId)
    }, 10000)
  }

  // Verificação manual
  const handleManualCheck = async () => {
    if (!paymentData?.invoiceId || isChecking) return

    setIsChecking(true)
    const isPaid = await checkPaymentStatus(paymentData.invoiceId)

    if (!isPaid) {
      // Mostra feedback visual
      setTimeout(() => setIsChecking(false), 1000)
    }
  }

  // Copia código PIX
  const copyPixCode = async () => {
    if (!paymentData?.qrcode) return

    try {
      await navigator.clipboard.writeText(paymentData.qrcode)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (paymentData && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [timeLeft, paymentData])

  // Formata tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  // Cria fatura ao carregar
  useEffect(() => {
    createInvoice()
  }, [])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full mx-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Gerando PIX...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full mx-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-600 mb-4">Erro ao gerar PIX</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={createInvoice}
            className="bg-black text-white py-3 px-6 rounded-md font-medium hover:bg-black/90 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </main>
    )
  }

  if (!paymentData) {
    return null
  }

  const shippingData = getShippingData()

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Timer */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-red-600 mr-2" />
              <span className="font-bold text-lg text-red-600">{formatTime(timeLeft)}</span>
            </div>
            <p className="text-sm text-red-600">Tempo restante para pagamento</p>
          </div>

          {/* Detalhes do pagamento */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold mb-2">Pagamento PIX</h1>
            <p className="text-gray-600 mb-4">{paymentData.description}</p>
            <div className="text-3xl font-bold text-green-600 mb-2">
              R$ {paymentData.amount.toFixed(2).replace(".", ",")}
            </div>
            <p className="text-sm text-gray-500">Frete {shippingData.name}</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-4">
              <Image
                src={paymentData.qrCodeUrl || "/placeholder.svg"}
                alt="QR Code PIX"
                width={300}
                height={300}
                className="rounded-lg"
              />
            </div>
            <p className="text-sm text-gray-600">Escaneie o QR Code com o app do seu banco ou copie o código PIX</p>
          </div>

          {/* Código PIX */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Código PIX (Copia e Cola)</label>
            <div className="flex">
              <input
                type="text"
                value={paymentData.qrcode}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={copyPixCode}
                className={`px-4 py-3 rounded-r-md border border-l-0 border-gray-300 transition-colors ${
                  copySuccess ? "bg-green-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {copySuccess ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copySuccess && <p className="text-sm text-green-600 mt-1">Código copiado!</p>}
          </div>

          {/* Botão verificar */}
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mb-4"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Verificar Pagamento
              </>
            )}
          </button>

          {/* Botão de teste - apenas para desenvolvimento */}
          {process.env.NODE_ENV === "development" && paymentData?.isSimulated && (
            <button
              onClick={() => {
                console.log("Simulando pagamento aprovado...")
                router.push("/success")
              }}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-md font-medium hover:bg-green-700 transition-colors mb-4"
            >
              🧪 Simular Pagamento Aprovado (DEV)
            </button>
          )}

          {/* Instruções */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Como pagar:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Abra o app do seu banco</li>
              <li>2. Escolha a opção PIX</li>
              <li>3. Escaneie o QR Code ou cole o código</li>
              <li>4. Confirme o pagamento</li>
              <li>5. Aguarde a confirmação automática</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  )
}
