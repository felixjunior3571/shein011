"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface WebhookData {
  id: number
  external_id: string
  invoice_id: string
  status_code: number
  status_name: string
  amount: number
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  received_at: string
}

export default function WebhookMonitorPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchWebhooks = async () => {
    try {
      setError(null)
      const response = await fetch("/api/superpaybr/webhook")
      const result = await response.json()

      if (result.success && result.data) {
        setWebhooks(result.data)
      } else {
        setWebhooks([])
      }
    } catch (err) {
      console.error("Erro ao buscar webhooks:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchWebhooks, 5000) // Atualizar a cada 5 segundos
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusIcon = (webhook: WebhookData) => {
    if (webhook.is_paid) return <CheckCircle className="w-5 h-5 text-green-600" />
    if (webhook.is_denied) return <XCircle className="w-5 h-5 text-red-600" />
    if (webhook.is_expired) return <Clock className="w-5 h-5 text-orange-600" />
    if (webhook.is_canceled) return <XCircle className="w-5 h-5 text-gray-600" />
    if (webhook.is_refunded) return <AlertTriangle className="w-5 h-5 text-yellow-600" />
    return <Clock className="w-5 h-5 text-blue-600" />
  }

  const getStatusColor = (webhook: WebhookData) => {
    if (webhook.is_paid) return "bg-green-100 text-green-800"
    if (webhook.is_denied) return "bg-red-100 text-red-800"
    if (webhook.is_expired) return "bg-orange-100 text-orange-800"
    if (webhook.is_canceled) return "bg-gray-100 text-gray-800"
    if (webhook.is_refunded) return "bg-yellow-100 text-yellow-800"
    return "bg-blue-100 text-blue-800"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Monitor de Webhooks SuperPayBR</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant={autoRefresh ? "default" : "outline"}
                  size="sm"
                >
                  {autoRefresh ? "🔄 Auto" : "⏸️ Manual"}
                </Button>
                <Button onClick={fetchWebhooks} disabled={loading} size="sm">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">Total de Webhooks</h3>
                <p className="text-2xl font-bold text-blue-600">{webhooks.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">Pagamentos Confirmados</h3>
                <p className="text-2xl font-bold text-green-600">{webhooks.filter((w) => w.is_paid).length}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800">Pagamentos Negados</h3>
                <p className="text-2xl font-bold text-red-600">{webhooks.filter((w) => w.is_denied).length}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800">Pagamentos Expirados</h3>
                <p className="text-2xl font-bold text-orange-600">{webhooks.filter((w) => w.is_expired).length}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700">❌ Erro: {error}</p>
              </div>
            )}

            {loading && webhooks.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando webhooks...</p>
              </div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Nenhum webhook recebido ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(webhook)}
                        <span className="font-semibold">{webhook.external_id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(webhook)}`}>
                          {webhook.status_name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">R$ {webhook.amount.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{new Date(webhook.received_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Invoice ID:</span>
                        <br />
                        {webhook.invoice_id}
                      </div>
                      <div>
                        <span className="font-medium">Status Code:</span>
                        <br />
                        {webhook.status_code}
                      </div>
                      <div>
                        <span className="font-medium">Pago:</span>
                        <br />
                        {webhook.is_paid ? "✅ Sim" : "❌ Não"}
                      </div>
                      <div>
                        <span className="font-medium">Negado:</span>
                        <br />
                        {webhook.is_denied ? "✅ Sim" : "❌ Não"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
