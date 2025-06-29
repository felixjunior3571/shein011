"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

interface InvoiceData {
  id: string
  invoice_id: string
  external_id: string
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
  type: "real" | "emergency"
}

export default function CheckoutPage() {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // ✅ MONITORAMENTO VIA WEBHOOK
  const { paymentStatus, status, isWaitingForWebhook } = useSuperpayWebhookMonitor({
    externalId: invoice?.external_id || null,
    invoiceId: invoice?.invoice_id || null,
    enableDebug: true,
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento confirmado!", data)
    },
  })

  // Criar fatura automaticamente ao carregar a página
  useEffect(() => {
    createInvoice()
  }, [])

  const createInvoice = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Criando fatura PIX...")

      const response = await fetch("/api/superpaybr/create-invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cpf-data": JSON.stringify({
            nome: "Cliente SHEIN",
            cpf: "00000000000",
          }),
          "x-user-email": "cliente@shein.com",
          "x-user-whatsapp": "11999999999",
          "x-delivery-address": JSON.stringify({
            street: "Rua Principal",
            number: "123",
            neighborhood: "Centro",
            city: "São Paulo",
            state: "SP",
            zipcode: "01001000",
          }),
        },
        body: JSON.stringify({
          amount: 34.9,
          shipping: 0,
          method: "EXPRESS",
        }),
      })

      const result = await response.json()

      if (result.success && result.data) {
        setInvoice(result.data)
        console.log("✅ Fatura criada:", result.data)
      } else {
        throw new Error(result.error || "Erro ao criar fatura")
      }
    } catch (err) {
      console.error("❌ Erro ao criar fatura:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  const copyPixCode = async () => {
    if (invoice?.pix.payload) {
      try {
        await navigator.clipboard.writeText(invoice.pix.payload)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error("Erro ao copiar:", err)
      }
    }
  }

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "waiting":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "denied":
      case "expired":
      case "canceled":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (paymentStatus) {
      case "confirmed":
        return "Pagamento Confirmado!"
      case "waiting":
        return "Aguardando Pagamento"
      case "denied":
        return "Pagamento Negado"
      case "expired":
        return "Pagamento Vencido"
      case "canceled":
        return "Pagamento Cancelado"
      default:
        return "Processando..."
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Gerando PIX...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao gerar PIX</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={createInvoice} className="w-full">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pagamento via PIX</h1>
          <p className="text-gray-600">Escaneie o QR Code ou copie o código PIX</p>
        </div>

        {/* Status do Pagamento */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3">
              {getStatusIcon()}
              <span className="text-lg font-medium">{getStatusText()}</span>
            </div>
            {paymentStatus === "confirmed" && (
              <div className="mt-4 text-center">
                <p className="text-green-600 font-medium">Redirecionando para página de sucesso...</p>
              </div>
            )}
            {isWaitingForWebhook && (
              <div className="mt-4 text-center">
                <div className="animate-pulse text-sm text-gray-500">Monitorando pagamento em tempo real...</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valor */}
        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Valor a pagar</p>
            <p className="text-3xl font-bold text-gray-900">R$ {(invoice.valores.bruto / 100).toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-2">
              Vencimento: {new Date(invoice.vencimento.dia).toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">QR Code PIX</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm">
              <img
                src={invoice.pix.qr_code || "/placeholder.svg"}
                alt="QR Code PIX"
                className="w-64 h-64 mx-auto"
                onError={(e) => {
                  console.error("Erro ao carregar QR Code")
                  e.currentTarget.src = "/placeholder.svg?height=256&width=256"
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-4">Abra o app do seu banco e escaneie o código</p>
          </CardContent>
        </Card>

        {/* PIX Copia e Cola */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">PIX Copia e Cola</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-sm font-mono break-all text-gray-800">{invoice.pix.payload}</p>
            </div>
            <Button onClick={copyPixCode} className="w-full bg-transparent" variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Copiado!" : "Copiar Código PIX"}
            </Button>
          </CardContent>
        </Card>

        {/* Informações */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Informações do Pagamento</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ID da Fatura:</span>
                <span className="font-mono">{invoice.invoice_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">External ID:</span>
                <span className="font-mono">{invoice.external_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span>{invoice.status.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo:</span>
                <span className="capitalize">{invoice.type === "emergency" ? "Emergência" : "Normal"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && status && (
          <Card className="mt-6 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <pre className="text-xs bg-yellow-50 p-4 rounded overflow-auto">{JSON.stringify(status, null, 2)}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
