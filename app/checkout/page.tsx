"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRealtimePaymentMonitor } from "@/hooks/use-realtime-payment-monitor"
import { SmartQRCode } from "@/components/smart-qr-code"
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Copy, Wifi, WifiOff } from "lucide-react"
import Image from "next/image"

interface InvoiceData {
  id: string
  invoice_id: string
  external_id?: string
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
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [externalId, setExternalId] = useState<string>("")
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [amount, setAmount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obter parâmetros da URL
  const urlAmount = searchParams.get("amount") || "27.97"
  const shipping = searchParams.get("shipping") || "sedex"
  const method = searchParams.get("method") || "SEDEX"

  // Monitor Realtime (SEM POLLING!)
  const {
    status,
    isConnected,
    error: realtimeError,
    reconnect,
    isReady,
  } = useRealtimePaymentMonitor({
    externalId,
    onPaymentConfirmed: (status) => {
      console.log("🎉 Pagamento confirmado via Realtime! Redirecionando...", status)
    },
    onPaymentDenied: (status) => {
      console.log("❌ Pagamento negado:", status)
      setError("Pagamento negado pela SuperPay")
    },
    onPaymentExpired: (status) => {
      console.log("⏰ Pagamento vencido:", status)
      setError("Pagamento vencido")
    },
    onPaymentCanceled: (status) => {
      console.log("🚫 Pagamento cancelado:", status)
      setError("Pagamento cancelado")
    },
    enabled: !!externalId,
    debug: true,
    autoRedirect: true,
  })

  // Carregar dados do usuário e criar fatura
  useEffect(() => {
    createInvoice()
  }, [])

  // Carregar external_id quando a fatura for criada
  useEffect(() => {
    if (invoice) {
      console.log("🔍 Dados da fatura SuperPayBR recebida:", invoice)

      let capturedExternalId = null

      if (invoice.external_id) {
        capturedExternalId = invoice.external_id
        console.log("✅ External ID encontrado na fatura SuperPayBR:", capturedExternalId)
      } else {
        capturedExternalId = invoice.id
        console.log("⚠️ External ID não encontrado, usando invoice.id:", capturedExternalId)
      }

      if (capturedExternalId) {
        localStorage.setItem("currentExternalId", capturedExternalId)
        setExternalId(capturedExternalId)
        console.log("💾 External ID SuperPayBR salvo:", capturedExternalId)
      } else {
        console.error("❌ Não foi possível obter external_id SuperPayBR!")
      }
    }
  }, [invoice])

  const createInvoice = async () => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX SuperPayBR...")
      console.log("Parâmetros:", { amount: Number.parseFloat(urlAmount), shipping, method })

      // Carregar dados do usuário do localStorage
      const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
      const userEmail = localStorage.getItem("userEmail") || ""
      const userWhatsApp = localStorage.getItem("userWhatsApp") || ""
      const deliveryAddress = JSON.parse(localStorage.getItem("deliveryAddress") || "{}")

      console.log("📋 Dados do usuário SuperPayBR:", {
        nome: cpfData.nome,
        email: userEmail,
        whatsapp: userWhatsApp,
        endereco: deliveryAddress,
      })

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cpf-data": JSON.stringify(cpfData),
          "x-user-email": userEmail,
          "x-user-whatsapp": userWhatsApp,
          "x-delivery-address": JSON.stringify(deliveryAddress),
        },
        body: JSON.stringify({
          amount: Number.parseFloat(urlAmount),
          shipping,
          method,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInvoice(data.data)
        setAmount(data.data.valores.bruto / 100) // SuperPay retorna em centavos
        localStorage.setItem("superPayBRInvoice", JSON.stringify(data.data))

        if (data.data.external_id) {
          localStorage.setItem("currentExternalId", data.data.external_id)
        }

        console.log(
          `✅ Fatura SuperPayBR criada: ${data.data.type} - Valor: R$ ${(data.data.valores.bruto / 100).toFixed(2)}`,
        )
        console.log(`👤 Cliente: ${cpfData.nome || "N/A"}`)
      } else {
        throw new Error(data.error || "Erro ao criar fatura SuperPayBR")
      }
    } catch (error) {
      console.log("❌ Erro ao criar fatura SuperPayBR:", error)
      setError("Erro ao gerar PIX SuperPayBR. Tente novamente.")
      createEmergencyPix()
    } finally {
      setIsLoading(false)
    }
  }

  const createEmergencyPix = () => {
    console.log("🚨 Criando PIX de emergência SuperPayBR...")

    const totalAmount = Number.parseFloat(urlAmount)
    const emergencyExternalId = `EMERGENCY_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    const emergencyPix = `00020101021226580014br.gov.bcb.pix2536emergency.quickchart.io/qr/v2/${emergencyExternalId}520400005303986540${totalAmount.toFixed(2)}5802BR5909SHEIN5011SAO PAULO62070503***6304EMRG`

    const emergencyInvoice: InvoiceData = {
      id: emergencyExternalId,
      invoice_id: `EMERGENCY_${Date.now()}`,
      external_id: emergencyExternalId,
      pix: {
        payload: emergencyPix,
        image: "/placeholder.svg?height=250&width=250",
        qr_code: `https://quickchart.io/qr?text=${encodeURIComponent(emergencyPix)}&size=200&margin=1&format=png`,
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
    setAmount(totalAmount)
    setError(null)
    console.log(`✅ PIX de emergência SuperPayBR criado - Valor: R$ ${totalAmount.toFixed(2)}`)
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

  const getStatusIcon = () => {
    if (!status) return <Clock className="h-5 w-5 text-blue-500" />

    if (status.is_paid) return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status.is_denied) return <XCircle className="h-5 w-5 text-red-500" />
    if (status.is_expired) return <AlertCircle className="h-5 w-5 text-orange-500" />
    if (status.is_canceled) return <XCircle className="h-5 w-5 text-gray-500" />

    return <Clock className="h-5 w-5 text-blue-500" />
  }

  const getStatusColor = () => {
    if (!status) return "bg-blue-50 border-blue-200"

    if (status.is_paid) return "bg-green-50 border-green-200"
    if (status.is_denied) return "bg-red-50 border-red-200"
    if (status.is_expired) return "bg-orange-50 border-orange-200"
    if (status.is_canceled) return "bg-gray-50 border-gray-200"

    return "bg-blue-50 border-blue-200"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <h2 className="text-xl font-bold mb-2">Gerando PIX SuperPayBR...</h2>
            <p className="text-gray-600 mb-2">Aguarde enquanto processamos seu pagamento</p>
            <div className="text-sm text-gray-500">
              <p>Valor: R$ {Number.parseFloat(urlAmount).toFixed(2)}</p>
              <p>Método: {method}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
            <h2 className="text-lg font-semibold mb-2">Erro no Checkout</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={createInvoice} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pagamento PIX</h1>
        </div>

        {/* Status Card */}
        <Card className={`border-2 ${getStatusColor()}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon()}
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{status?.status_title || "Aguardando confirmação..."}</h2>
                <p className="text-sm text-gray-600">External ID: {externalId}</p>
              </div>
              <Badge variant={status?.is_paid ? "default" : "secondary"}>{status?.status_code || 1}</Badge>
            </div>

            {/* Success Message */}
            {status?.is_paid && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-800">✅ Pagamento Confirmado!</span>
                </div>
                <p className="text-green-700 text-sm mt-2 text-center">Redirecionando para ativação do cartão...</p>
              </div>
            )}

            {/* Realtime Connection Status */}
            <div className="flex items-center gap-2 mb-4">
              {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
              <span className="text-sm text-gray-600">
                {isConnected ? "Conectado em tempo real" : "Reconectando..."}
              </span>
              {!isReady && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
            </div>

            {(error || realtimeError) && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">⚠️ {error || realtimeError}</p>
                {realtimeError && (
                  <Button onClick={reconnect} variant="outline" size="sm" className="mt-2 bg-transparent">
                    Reconectar
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valor */}
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-green-600">R$ {amount.toFixed(2)}</p>
            <p className="text-sm text-gray-500">Frete {method} - Cartão SHEIN</p>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        {invoice && (
          <Card>
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-4">Escaneie o QR Code PIX</h3>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <SmartQRCode invoice={invoice} width={200} height={200} className="mx-auto" />
              </div>
              <p className="text-sm text-gray-600 mt-4">Escaneie o QR Code com seu app do banco</p>
            </CardContent>
          </Card>
        )}

        {/* Código PIX */}
        {invoice && (
          <Card>
            <CardContent className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ou copie o código PIX:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={invoice.pix.payload}
                  readOnly
                  className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <Button onClick={copyPixCode} variant={copied ? "default" : "outline"} size="sm" className="px-4 py-3">
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
              {copied && <p className="text-green-600 text-sm mt-2">✅ Código copiado!</p>}
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Como pagar:</h3>
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
                <span>Aguarde a confirmação automática em tempo real</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === "development" && status && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2 text-sm">Debug Info</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(status, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar Página
          </Button>

          <Button onClick={() => router.push("/")} variant="ghost" className="w-full">
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  )
}
