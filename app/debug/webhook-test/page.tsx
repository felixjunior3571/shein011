"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw, Send, Database } from "lucide-react"

export default function WebhookTestPage() {
  const [externalId, setExternalId] = useState("SHEIN_1751357101223_oqb6j01qc")
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const simulateWebhook = async (statusCode: number) => {
    setIsProcessing(true)
    setError(null)
    setResult(null)

    try {
      console.log(`🧪 Simulando webhook com status ${statusCode} para ${externalId}`)

      const webhookData = {
        event: {
          type: "webhook.update",
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
        },
        invoices: {
          id: Date.now().toString(),
          external_id: externalId,
          token: null,
          date: new Date().toISOString().replace("T", " ").substring(0, 19),
          status: {
            code: statusCode,
            title: statusCode === 5 ? "Pagamento Confirmado!" : `Status ${statusCode}`,
            description: statusCode === 5 ? "Obrigado pela sua Compra!" : `Descrição do status ${statusCode}`,
            text: statusCode === 5 ? "approved" : "pending",
          },
          customer: 999999,
          prices: {
            total: 0.28,
            discount: 0,
            taxs: {
              others: 0,
            },
            refound: null,
          },
          type: "PIX",
          payment: {
            gateway: "SuperPay",
            date: new Date().toISOString().replace("T", " ").substring(0, 19),
            due: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19),
            card: null,
            payId: null,
            payDate: new Date().toISOString().replace("T", " ").substring(0, 19),
            details: {
              barcode: null,
              pix_code: null,
              qrcode: "00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/test",
              url: null,
            },
          },
        },
      }

      console.log("📦 Dados do webhook:", webhookData)

      const response = await fetch("/api/superpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "SuperPay-Webhook-Test/1.0",
        },
        body: JSON.stringify(webhookData),
      })

      const data = await response.json()
      console.log("📥 Resposta do webhook:", data)

      if (response.ok && data.success) {
        setResult(data)
        console.log("✅ Webhook processado com sucesso!")
      } else {
        throw new Error(data.message || data.error || "Erro no webhook")
      }
    } catch (error) {
      console.error("❌ Erro no teste de webhook:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setIsProcessing(false)
    }
  }

  const checkDatabase = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      console.log("🔍 Verificando dados no banco...")

      const response = await fetch(`/api/superpay/payment-status?externalId=${encodeURIComponent(externalId)}`)
      const data = await response.json()

      console.log("📄 Dados do banco:", data)
      setResult(data)
    } catch (error) {
      console.error("❌ Erro ao verificar banco:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">🧪 Teste de Webhook SuperPay</h1>
          <p className="text-gray-600">Simule webhooks e teste o sistema de pagamentos</p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">External ID:</label>
              <Input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="SHEIN_1751357101223_oqb6j01qc"
                className="font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Simular Webhooks:</h3>
                <Button
                  onClick={() => simulateWebhook(5)}
                  disabled={isProcessing || !externalId}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Pagamento Confirmado (Status 5)
                </Button>
                <Button
                  onClick={() => simulateWebhook(6)}
                  disabled={isProcessing || !externalId}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Pagamento Negado (Status 6)
                </Button>
                <Button
                  onClick={() => simulateWebhook(1)}
                  disabled={isProcessing || !externalId}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aguardando Pagamento (Status 1)
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Verificar Sistema:</h3>
                <Button
                  onClick={checkDatabase}
                  disabled={isProcessing || !externalId}
                  variant="outline"
                  className="w-full bg-transparent"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Verificar no Banco
                </Button>
                <Button
                  onClick={() => window.open(`/checkout?external_id=${externalId}`, "_blank")}
                  disabled={!externalId}
                  variant="outline"
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Abrir Checkout
                </Button>
                <Button
                  onClick={() => window.open("/debug/webhook-status", "_blank")}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Monitor Webhooks
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing */}
        {isProcessing && (
          <Card>
            <CardContent className="p-6 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-lg font-semibold">Processando...</p>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">Resultado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
