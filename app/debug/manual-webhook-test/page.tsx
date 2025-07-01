"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, XCircle, RefreshCw, Database, Webhook, Play, Eye } from "lucide-react"

export default function ManualWebhookTestPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [databaseData, setDatabaseData] = useState<any>(null)
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false)

  // Webhook real recebido da SuperPay
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
    try {
      setIsProcessing(true)
      setError(null)
      setResult(null)

      console.log("🔄 Enviando webhook real para processamento...")

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

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        console.log("✅ Webhook processado com sucesso:", data)
      } else {
        throw new Error(data.message || "Erro no processamento")
      }
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setIsProcessing(false)
    }
  }

  const checkDatabase = async () => {
    try {
      setIsCheckingDatabase(true)
      setDatabaseData(null)

      console.log("🔍 Verificando dados no Supabase...")

      const response = await fetch(`/api/superpay/payment-status?external_id=${realWebhookData.invoices.external_id}`, {
        method: "GET",
      })

      const data = await response.json()

      if (response.ok) {
        setDatabaseData(data)
        console.log("✅ Dados encontrados no Supabase:", data)
      } else {
        throw new Error(data.message || "Erro na consulta")
      }
    } catch (error) {
      console.error("❌ Erro ao consultar Supabase:", error)
      setError(error instanceof Error ? error.message : "Erro desconhecido")
    } finally {
      setIsCheckingDatabase(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teste Manual de Webhook SuperPay</h1>
          <p className="text-gray-600">Processamento do webhook real recebido em 01/07/2025 às 03:03</p>
        </div>

        {/* Webhook Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Dados do Webhook Real
            </CardTitle>
            <CardDescription>Webhook recebido da SuperPay com status code 5 (Pagamento Confirmado)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-500">External ID:</span>
                <p className="font-mono text-sm">{realWebhookData.invoices.external_id}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Invoice ID:</span>
                <p className="font-mono text-sm">{realWebhookData.invoices.id}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status Code:</span>
                <Badge className="bg-green-500">{realWebhookData.invoices.status.code}</Badge>
              </div>
              <div>
                <span className="text-sm text-gray-500">Valor:</span>
                <p className="font-bold text-green-600">R$ {realWebhookData.invoices.prices.total.toFixed(2)}</p>
              </div>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                Ver JSON completo do webhook
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(realWebhookData, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Processar Webhook
              </CardTitle>
              <CardDescription>Enviar o webhook real para o endpoint /api/superpay/webhook</CardDescription>
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
                    <Play className="h-4 w-4 mr-2" />
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
                Verificar Dados
              </CardTitle>
              <CardDescription>Consultar dados salvos no Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={checkDatabase}
                disabled={isCheckingDatabase}
                variant="outline"
                className="w-full bg-transparent"
              >
                {isCheckingDatabase ? (
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

        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Processing Result */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Resultado do Processamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status:</span>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Sucesso" : "Erro"}
                  </Badge>
                </div>

                {result.success && result.data && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">External ID:</span>
                      <p className="font-mono">{result.data.external_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status Code:</span>
                      <p className="font-bold">{result.data.status_code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status Title:</span>
                      <p className="font-medium">{result.data.status_title}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Valor:</span>
                      <p className="font-bold text-green-600">R$ {result.data.amount?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Is Paid:</span>
                      <Badge variant={result.data.is_paid ? "default" : "secondary"}>
                        {result.data.is_paid ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Is Critical:</span>
                      <Badge variant={result.data.is_critical ? "default" : "secondary"}>
                        {result.data.is_critical ? "Sim" : "Não"}
                      </Badge>
                    </div>
                  </div>
                )}

                <Separator />

                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                    Ver resposta completa
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Database Data */}
        {databaseData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                Dados no Supabase
              </CardTitle>
            </CardHeader>
            <CardContent>
              {databaseData.success && databaseData.data ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">External ID:</span>
                      <p className="font-mono">{databaseData.data.external_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status Code:</span>
                      <p className="font-bold">{databaseData.data.status_code}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status Title:</span>
                      <p className="font-medium">{databaseData.data.status_title}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Valor:</span>
                      <p className="font-bold text-green-600">R$ {databaseData.data.amount?.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Is Paid:</span>
                      <Badge variant={databaseData.data.is_paid ? "default" : "secondary"}>
                        {databaseData.data.is_paid ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Processado em:</span>
                      <p className="text-xs">{new Date(databaseData.data.processed_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Atualizado em:</span>
                      <p className="text-xs">{new Date(databaseData.data.updated_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>

                  <Separator />

                  <details className="text-sm">
                    <summary className="cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                      Ver dados completos do Supabase
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(databaseData.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Nenhum dado encontrado no Supabase</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {databaseData.message || "Execute o processamento do webhook primeiro"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções de Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </span>
                <span>Execute o script SQL no Supabase para criar/atualizar a tabela</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </span>
                <span>Clique em "Processar Webhook" para simular o webhook real</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </span>
                <span>Clique em "Verificar Dados" para consultar o Supabase</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  4
                </span>
                <span>Teste a página /checkout com o external_id: SHEIN_1751349759845_i6qouytzp</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
