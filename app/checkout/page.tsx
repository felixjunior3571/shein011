"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Copy, CheckCircle, Clock, Smartphone, QrCode } from "lucide-react"
import { usePageTracking, useTracking } from "@/hooks/use-tracking"

interface InvoiceData {
  id: string
  secure: {
    id: string
    url: string
  }
  pix: {
    payload: string
    image: string
  }
  status: {
    code: number
    title: string
  }
  valores: {
    bruto: number
  }
  vencimento: {
    dia: string
  }
}

interface CheckoutData {
  amount: number
  clientName: string
  clientDocument: string
  clientEmail: string
  clientPhone?: string
  productTitle: string
  orderId: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const { trackPaymentAttempt } = useTracking()

  usePageTracking("checkout")

  const [isLoading, setIsLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [copied, setCopied] = useState(false)
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "checking" | "paid" | "expired">("pending")

  // Carregar dados do localStorage
  useEffect(() => {
    try {
      const savedCheckoutData = localStorage.getItem("checkoutData")
      const savedInvoice = localStorage.getItem("tryploPayInvoice")

      if (savedCheckoutData) {
        setCheckoutData(JSON.parse(savedCheckoutData))
      }

      if (savedInvoice) {
        setInvoice(JSON.parse(savedInvoice))
        setIsLoading(false)
      } else if (savedCheckoutData) {
        // Se não tem invoice salva, criar uma nova
        createInvoice(JSON.parse(savedCheckoutData))
      } else {
        // Se não tem dados, redirecionar
        router.push("/shipping-method")
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      setError("Erro ao carregar dados do pagamento")
      setIsLoading(false)
    }
  }, [router])

  // Criar fatura PIX
  const createInvoice = async (data: CheckoutData) => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("=== CRIANDO FATURA PIX ===")
      console.log("Dados:", data)

      trackPaymentAttempt("pix", data.amount.toString())

      const response = await fetch("/api/tryplopay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: data.amount,
          clientName: data.clientName,
          clientDocument: data.clientDocument,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          productTitle: data.productTitle,
          orderId: data.orderId,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao criar fatura")
      }

      console.log("✅ Fatura criada:", result)

      setInvoice(result.fatura)
      localStorage.setItem("tryploPayInvoice", JSON.stringify(result.fatura))

      // Mostrar tipo de fatura nos logs
      if (result.simulated) {
        console.log("ℹ️ Usando fatura simulada")
      } else if (result.emergency) {
        console.log("⚠️ Usando fatura de emergência")
      } else if (result.real) {
        console.log("✅ Usando fatura real da TryploPay")
      }
    } catch (error) {
      console.error("❌ Erro ao criar fatura:", error)
      setError(`Erro ao gerar PIX: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && paymentStatus === "pending") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      setPaymentStatus("expired")
    }
  }, [timeLeft, paymentStatus])

  // Verificar pagamento automaticamente
  const checkPayment = useCallback(async () => {
    if (!invoice || isCheckingPayment || paymentStatus !== "pending") return

    try {
      setIsCheckingPayment(true)
      setPaymentStatus("checking")

      console.log("=== VERIFICANDO PAGAMENTO ===")

      const response = await fetch(`/api/tryplopay/check-payment?invoiceId=${invoice.id}&token=${invoice.secure.id}`)
      const result = await response.json()

      console.log("Status do pagamento:", result)

      if (result.success && result.isPaid) {
        console.log("✅ PAGAMENTO CONFIRMADO!")
        setPaymentStatus("paid")

        // Salvar confirmação
        localStorage.setItem("paymentConfirmed", "true")
        localStorage.setItem("paymentData", JSON.stringify(result))

        // Redirecionar para sucesso após 2 segundos
        setTimeout(() => {
          router.push("/success")
        }, 2000)
      } else {
        setPaymentStatus("pending")
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error)
      setPaymentStatus("pending")
    } finally {
      setIsCheckingPayment(false)
    }
  }, [invoice, isCheckingPayment, paymentStatus, router])

  // Verificar pagamento a cada 10 segundos
  useEffect(() => {
    if (invoice && paymentStatus === "pending") {
      const interval = setInterval(checkPayment, 10000)
      return () => clearInterval(interval)
    }
  }, [invoice, paymentStatus, checkPayment])

  // Copiar código PIX
  const copyPixCode = async () => {
    if (!invoice?.pix?.payload) return

    try {
      await navigator.clipboard.writeText(invoice.pix.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
      // Fallback para navegadores mais antigos
      const textArea = document.createElement("textarea")
      textArea.value = invoice.pix.payload
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Formatar valor
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">Gerando PIX...</h2>
          <p className="text-gray-600">Aguarde enquanto preparamos seu pagamento</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-red-500 mb-4">
            <Clock size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-red-600">Erro no Pagamento</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-black hover:bg-black/80 text-white font-bold py-3 px-4 rounded-md transition"
          >
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">Dados não encontrados</h2>
          <p className="text-gray-600 mb-6">Não foi possível carregar os dados do pagamento</p>
          <button
            onClick={() => router.push("/shipping-method")}
            className="w-full bg-black hover:bg-black/80 text-white font-bold py-3 px-4 rounded-md transition"
          >
            VOLTAR
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header com timer */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">Pagamento PIX</h1>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                paymentStatus === "paid"
                  ? "bg-green-100 text-green-800"
                  : paymentStatus === "expired"
                    ? "bg-red-100 text-red-800"
                    : paymentStatus === "checking"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-blue-100 text-blue-800"
              }`}
            >
              {paymentStatus === "paid" ? (
                <>
                  <CheckCircle size={16} />
                  PAGO
                </>
              ) : paymentStatus === "expired" ? (
                <>
                  <Clock size={16} />
                  EXPIRADO
                </>
              ) : paymentStatus === "checking" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  VERIFICANDO
                </>
              ) : (
                <>
                  <Clock size={16} />
                  {formatTime(timeLeft)}
                </>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 mb-2">{formatCurrency(invoice.valores.bruto)}</p>
            <p className="text-sm text-gray-600">{checkoutData?.productTitle || "Cartão SHEIN"}</p>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4 text-center">
          <div className="mb-4">
            <QrCode size={24} className="mx-auto mb-2 text-gray-600" />
            <h3 className="font-bold mb-2">Escaneie o QR Code</h3>
            <p className="text-sm text-gray-600 mb-4">Use o app do seu banco para escanear</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <img
              src={invoice.pix.image || "/placeholder.svg"}
              alt="QR Code PIX"
              className="w-64 h-64 mx-auto border rounded-lg"
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=250&width=250"
              }}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Smartphone size={16} />
            <span>Abra o app do seu banco e escaneie o código</span>
          </div>
        </div>

        {/* Código PIX */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h3 className="font-bold mb-2">Ou copie o código PIX</h3>
          <p className="text-sm text-gray-600 mb-4">Cole no seu app de pagamentos</p>

          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-xs font-mono break-all text-gray-800">{invoice.pix.payload}</p>
          </div>

          <button
            onClick={copyPixCode}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md font-bold transition ${
              copied ? "bg-green-500 text-white" : "bg-black hover:bg-black/80 text-white"
            }`}
          >
            {copied ? (
              <>
                <CheckCircle size={20} />
                CÓDIGO COPIADO!
              </>
            ) : (
              <>
                <Copy size={20} />
                COPIAR CÓDIGO PIX
              </>
            )}
          </button>
        </div>

        {/* Status do pagamento */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-bold mb-4">Status do Pagamento</h3>

          {paymentStatus === "paid" ? (
            <div className="text-center text-green-600">
              <CheckCircle size={48} className="mx-auto mb-2" />
              <p className="font-bold">Pagamento Confirmado!</p>
              <p className="text-sm">Redirecionando...</p>
            </div>
          ) : paymentStatus === "expired" ? (
            <div className="text-center text-red-600">
              <Clock size={48} className="mx-auto mb-2" />
              <p className="font-bold">Pagamento Expirado</p>
              <p className="text-sm mb-4">O tempo limite foi atingido</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-black hover:bg-black/80 text-white font-bold py-2 px-4 rounded-md transition"
              >
                GERAR NOVO PIX
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    paymentStatus === "checking" ? "bg-yellow-500 animate-pulse" : "bg-blue-500"
                  }`}
                ></div>
                <span className="text-sm">
                  {paymentStatus === "checking" ? "Verificando pagamento..." : "Aguardando pagamento"}
                </span>
              </div>

              <p className="text-xs text-gray-500">Verificamos automaticamente a cada 10 segundos</p>

              <button
                onClick={checkPayment}
                disabled={isCheckingPayment}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition disabled:opacity-50"
              >
                {isCheckingPayment ? "VERIFICANDO..." : "VERIFICAR AGORA"}
              </button>
            </div>
          )}
        </div>

        {/* Instruções */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Após o pagamento, você será redirecionado automaticamente. O PIX é processado instantaneamente.
          </p>
        </div>
      </div>
    </div>
  )
}
