"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Copy, Check, RefreshCw, ArrowLeft } from "lucide-react"

interface Invoice {
  id: string
  amount: number
  pixCode: string
  qrCode: string
  status: "pending" | "paid" | "expired"
  type: "real" | "simulated" | "emergency"
  expiresAt: string
}

export default function CheckoutPage() {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const router = useRouter()

  useEffect(() => {
    // Get shipping method and price from localStorage
    const shippingMethod = localStorage.getItem("selectedShippingMethod")
    const shippingPrice = localStorage.getItem("selectedShippingPrice")

    if (!shippingMethod || !shippingPrice) {
      router.push("/shipping-method")
      return
    }

    // Create invoice
    createInvoice(Number.parseFloat(shippingPrice))
  }, [router])

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  useEffect(() => {
    if (invoice && invoice.status === "pending") {
      const interval = setInterval(() => {
        checkPaymentStatus()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [invoice])

  const createInvoice = async (amount: number) => {
    try {
      const response = await fetch("/api/tryplopay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          description: "Pagamento do frete SHEIN",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setInvoice(data)
      } else {
        console.error("Erro ao criar invoice")
      }
    } catch (error) {
      console.error("Erro:", error)
    }
  }

  const checkPaymentStatus = async () => {
    if (!invoice) return

    setChecking(true)
    try {
      const response = await fetch(`/api/tryplopay/check-payment?invoiceId=${invoice.id}`)

      if (response.ok) {
        const data = await response.json()
        if (data.status === "paid") {
          setInvoice((prev) => (prev ? { ...prev, status: "paid" } : null))
          setTimeout(() => {
            router.push("/success")
          }, 2000)
        }
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error)
    } finally {
      setChecking(false)
    }
  }

  const copyPixCode = async () => {
    if (invoice?.pixCode) {
      try {
        await navigator.clipboard.writeText(invoice.pixCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error("Erro ao copiar:", error)
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusColor = () => {
    if (invoice?.status === "paid") return "text-green-600"
    if (invoice?.status === "expired") return "text-red-600"
    return "text-yellow-600"
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Gerando pagamento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="flex items-center text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <div className="flex items-center space-x-2">
            <Image src="/shein-logo.png" alt="SHEIN" width={80} height={25} className="object-contain" />
          </div>
          <div className="flex items-center justify-center space-x-2">
            {checking && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Payment Status */}
          {invoice.status === "paid" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Pagamento confirmado!</span>
              </div>
            </div>
          )}

          {/* Timer */}
          {invoice.status === "pending" && (
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 mb-2">Tempo para pagamento:</p>
              <div className="text-2xl font-bold text-red-600">{formatTime(timeLeft)}</div>
            </div>
          )}

          {/* Amount */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-1">Valor a pagar:</p>
            <p className="text-3xl font-bold text-gray-900">R$ {invoice.amount.toFixed(2).replace(".", ",")}</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
              <Image
                src={invoice.qrCode || "/placeholder.svg"}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
          </div>

          {/* PIX Code */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
            <div className="flex">
              <input
                type="text"
                value={invoice.pixCode}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={copyPixCode}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <p className="text-sm text-green-600 mt-1">Código copiado!</p>}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Como pagar:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Abra o app do seu banco</li>
              <li>2. Escolha a opção PIX</li>
              <li>3. Escaneie o QR Code ou cole o código</li>
              <li>4. Confirme o pagamento</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
