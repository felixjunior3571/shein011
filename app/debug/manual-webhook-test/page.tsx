"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, RefreshCw, Database, Webhook, Eye } from "lucide-react"

interface WebhookResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

interface DatabaseRecord {
  id: number
  external_id: string
  status_code: number
  status_title: string
  amount: number
  is_paid: boolean
  processed_at: string
}

export default function ManualWebhookTestPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [webhookResult, setWebhookResult] = useState<WebhookResponse | null>(null)
  const [databaseRecords, setDatabaseRecords] = useState<DatabaseRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  // Dados do webhook real que falhou
  const realWebhookData = {
    event: {
      type: "webhook.update",
      date: "2025-07-01 03:03:35",
    },
    invoices: {
      id: "1751350068",
      external_id: "SHEIN_1751349759845_i6qouytzp",
      token: null,
      date: "2025-07-01 03:02:42",
      status: {
        code: 5,
        title: "Pagamento Confirmado!",
        description: "Obrigado pela sua Compra!",
        text: "approved",
      },
      customer: 138511,
      prices: {
        total: 27.97,
        discount: 0,
        taxs: {
          others: 0,
        },
        refound: null,
      },
      type: "PIX",
      payment: {
        gateway: "SuperPay",
        date: "2025-07-01 03:03:33",
        due: "2025-07-02 00:00:00",
        card: null,
        payId: null,
        payDate: "2025-07-01 03:03:33",
        details: {
          barcode: null,
          pix_code: null,
          qrcode:
            "00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/f55b76c1-b79c-4a2e-b0e9-6452955c7c795204000053039865802BR5925POWER_TECH_SOLUTIONS_LTDA6006CANOAS62070503***6304C0EE",
          url: null,
        },
      },
    },
  }

  const processWebhook = async () => {
    setIsProcessing(true)
    setError(null)
    setWebhookResult(null)

    try {
      console.log("🔄 Processando webhook manual...")
      console.log("📦 Dados:", realWebhookData)

      const response = await fetch("/api/superpay/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          UserId: "309",
          id: "105882",
          Gateway: "WL40",
          Powered: "WL40",
          Webhook: "OmQzUmZjSjRHNDVVMG1ZbA==",
        },
        body: JSON.stringify(realWebhookData),
      })

      const result = await response.json()
      console.log("✅ Resposta do webhook:", result)

      setWebhookResult(result)

      if (result.success) {
        console.log("🎉 Webhook processado com sucesso!")
        // Verificar dados automaticamente após processar
        setTimeout(() => {
          checkDatabaseRecords()
        }, 1000)
      } else {
        console.error("❌ Erro no webhook:", result.error)
        setError(result.message || result.error)
      }
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error)
      setError(`Erro de rede: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const checkDatabaseRecords = async () => {
    setIsChecking(true)
    setError(null)

    try {
      console.log("🔍 Verificando dados no banco...")

      const response = await fetch("/api/superpaybr/check-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: "SHEIN_1751349759845_i6qouytzp",
        }),
      })

      const result = await response.json()
      console.log("📄 Dados do banco:", result)

      if (result.success && result.data) {
        setDatabaseRecords(Array.isArray(result.data) ? result.data : [result.data])
      } else {
        setError(result.message || "Nenhum dado encontrado")
      }
    } catch (error) {
      console.error("❌ Erro ao verificar banco:", error)
      setError(`Erro ao consultar banco: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🧪 Teste Manual de Webhook</h1>
          <p className="text-gray-600">Teste o processamento do webhook SuperPay que falhou</p>
        </div>

        {/* Dados do Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Dados do Webhook Real
            </CardTitle>
            <CardDescription>
              Webhook que foi enviado em 01/07/2025 às 03:03 com status code 5 (Pagamento Confirmado)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700">External ID:</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{realWebhookData.invoices.external_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Invoice ID:</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{realWebhookData.invoices.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status Code:</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  {realWebhookData.invoices.status.code} - {realWebhookData.invoices.status.title}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Valor:</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                  R$ {realWebhookData.invoices.prices.total.toFixed(2)}
                </p>
              </div>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">Ver JSON completo</summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
                {JSON.stringify(realWebhookData, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                1. Processar Webhook
              </CardTitle>
              <CardDescription>Enviar o webhook para o endpoint /api/superpay/webhook</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={processWebhook} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Webhook className="h-4 w-4 mr-2" />
                    Processar Webhook
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                2. Verificar Dados
              </CardTitle>
              <CardDescription>Consultar os dados salvos no Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={checkDatabaseRecords}
                disabled={isChecking}
                variant="outline"
                className="w-full bg-transparent"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Verificar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Resultado do Webhook */}
        {webhookResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {webhookResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Resultado do Webhook
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={webhookResult.success ? "default" : "destructive"}>
                    {webhookResult.success ? "Sucesso" : "Erro"}
                  </Badge>
                  <span className="text-sm">{webhookResult.message}</span>
                </div>

                {webhookResult.data && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">External ID:</label>
                      <p className="text-sm">{webhookResult.data.external_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status:</label>
                      <p className="text-sm">{webhookResult.data.status_title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Valor:</label>
                      <p className="text-sm">R$ {webhookResult.data.amount?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Pago:</label>
                      <p className="text-sm">{webhookResult.data.is_paid ? "✅ Sim" : "❌ Não"}</p>
                    </div>
                  </div>
                )}

                <details>
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">Ver resposta completa</summary>
                  <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64 mt-2">
                    {JSON.stringify(webhookResult, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados do Banco */}
        {databaseRecords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Dados Salvos no Supabase
              </CardTitle>
              <CardDescription>Registros encontrados na tabela payment_webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {databaseRecords.map((record, index) => (
                  <div key={record.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">ID:</label>
                        <p className="text-sm">{record.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">External ID:</label>
                        <p className="text-sm font-mono">{record.external_id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status:</label>
                        <div className="flex items-center gap-2">
                          <Badge variant={record.is_paid ? "default" : "secondary"}>{record.status_code}</Badge>
                          <span className="text-sm">{record.status_title}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Valor:</label>
                        <p className="text-sm font-bold text-green-600">R$ {record.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Pago:</label>
                        <p className="text-sm">{record.is_paid ? "✅ Sim" : "❌ Não"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Processado:</label>
                        <p className="text-sm">{new Date(record.processed_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>1.</strong> Execute o SQL script <code>scripts/create-payment-webhooks-table.sql</code> no
                Supabase
              </p>
              <p>
                <strong>2.</strong> Clique em "Processar Webhook" para testar o endpoint
              </p>
              <p>
                <strong>3.</strong> Clique em "Verificar Dados" para ver se foi salvo no banco
              </p>
              <p>
                <strong>4.</strong> Acesse <code>/checkout?external_id=SHEIN_1751349759845_i6qouytzp</code> para testar
                o Realtime
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
