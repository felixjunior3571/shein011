"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Copy, CheckCircle, RefreshCw, Clock, CreditCard } from "lucide-react"
import Image from "next/image"
import { usePageTracking } from "@/hooks/use-tracking"

interface Invoice {
  id: string
  amount: number
  qrCode: string
  pixCode: string
  status: "pending" | "paid" | "expired"
  expiresAt: string
  type?: "real" | "simulated" | "emergency"
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [checking, setChecking] = useState(false)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Rastreia a página de checkout
  usePageTracking("checkout")

  // Pega os parâmetros da URL
  const amount = searchParams.get("amount")
  const shipping = searchParams.get("shipping")
  const method = searchParams.get("method")

  // Valor padrão se não houver parâmetros
  const finalAmount = amount ? Number.parseFloat(amount) : 34.9

  useEffect(() => {
    createInvoice()
  }, [])

  // Timer para expiração
  useEffect(() => {
    if (invoice && invoice.status === "pending") {
      const interval = setInterval(() => {
        const now = new Date().getTime()
        const expiry = new Date(invoice.expiresAt).getTime()
        const difference = expiry - now

        if (difference > 0) {
          setTimeLeft(Math.floor(difference / 1000))
        } else {
          setTimeLeft(0)
          setInvoice((prev) => (prev ? { ...prev, status: "expired" } : null))
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current)
          }
        }
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [invoice])

  // Verificação automática do pagamento
  useEffect(() => {
    if (invoice && invoice.status === "pending") {
      checkIntervalRef.current = setInterval(() => {
        checkPaymentStatus()
      }, 5000) // Verifica a cada 5 segundos

      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
        }
      }
    }
  }, [invoice])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/tryplopay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount,
          description: `Pagamento de envio - ${method || "SEDEX"}`,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao criar cobrança PIX")
      }

      const data = await response.json()
      console.log("Invoice criada:", data)

      setInvoice(data)
    } catch (error) {
      console.error("Erro ao criar invoice:", error)
      setError("Erro ao gerar PIX. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!invoice || checking) return

    try {
      setChecking(true)
      const response = await fetch(`/api/tryplopay/check-payment?invoiceId=${invoice.id}`)

      if (response.ok) {
        const data = await response.json()
        console.log("Status do pagamento:", data)

        if (data.status === "paid") {
          setInvoice((prev) => (prev ? { ...prev, status: "paid" } : null))

          // Para a verificação automática
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current)
          }

          // Redireciona para página de sucesso após 2 segundos
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

  const copyToClipboard = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Gerando PIX...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao gerar PIX</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={createInvoice}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados do PIX</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image src="/shein-header-logo.png" alt="SHEIN" width={80} height={25} className="object-contain" />
            <div className="flex items-center justify-center space-x-2">
              {checking && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
            </div>
          </div>
          {invoice.status === "pending" && timeLeft > 0 && (
            <div className="flex items-center space-x-2 text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        {invoice.status === "paid" ? (
          // Tela de pagamento aprovado
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-green-500 mb-4">
              <CheckCircle className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pagamento Aprovado!</h2>
            <p className="text-gray-600 mb-4">Seu pagamento foi processado com sucesso.</p>
            <p className="text-sm text-gray-500">Redirecionando...</p>
          </div>
        ) : invoice.status === "expired" ? (
          // Tela de PIX expirado
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-red-500 mb-4">
              <Clock className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">PIX Expirado</h2>
            <p className="text-gray-600 mb-6">O tempo para pagamento expirou. Gere um novo PIX para continuar.</p>
            <button
              onClick={createInvoice}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Gerar Novo PIX
            </button>
          </div>
        ) : (
          // Tela principal do PIX
          <div className="space-y-6">
            {/* Informações do pagamento */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center mb-4">
                <CreditCard className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                <h1 className="text-xl font-bold text-gray-900">Pagamento via PIX</h1>
                <p className="text-gray-600">Escaneie o QR Code ou copie o código</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Método de envio:</span>
                  <span className="font-medium">{method || "SEDEX"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor:</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {finalAmount.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">QR Code PIX</h2>
              <div className="flex justify-center mb-4">
                <Image
                  src={invoice.qrCode || "/placeholder.svg"}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  className="border border-gray-200 rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600">Abra o app do seu banco e escaneie o código</p>
            </div>

            {/* Código PIX */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Código PIX</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-800 break-all font-mono leading-relaxed">{invoice.pixCode}</p>
              </div>
              <button
                onClick={copyToClipboard}
                className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                  copied
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Código Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copiar Código PIX</span>
                  </>
                )}
              </button>
            </div>

            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Como pagar:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha a opção PIX</li>
                <li>3. Escaneie o QR Code ou cole o código</li>
                <li>4. Confirme o pagamento</li>
              </ol>
            </div>

            {/* Status */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-yellow-800 font-medium">Aguardando pagamento...</span>
              </div>
              <p className="text-yellow-700 text-sm mt-1">O pagamento será confirmado automaticamente</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
