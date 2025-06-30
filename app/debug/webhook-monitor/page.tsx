"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface WebhookData {
  externalId: string
  statusCode: number
  statusName: string
  amount: number
  isPaid: boolean
  isDenied: boolean
  isExpired: boolean
  lastUpdate: string
}

export default function WebhookMonitorPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  // Simular dados de webhook para demonstração
  useEffect(() => {
    const loadWebhooks = () => {
      // Simular alguns webhooks para demonstração
      const mockWebhooks: WebhookData[] = [
        {
          externalId: "CHECKOUT_1703123456789_abc123",
          statusCode: 5,
          statusName: "Pagamento Confirmado",
          amount: 34.9,
          isPaid: true,
          isDenied: false,
          isExpired: false,
          lastUpdate: new Date().toISOString(),
        },
        {
          externalId: "CHECKOUT_1703123456790_def456",
          statusCode: 1,
          statusName: "Aguardando Pagamento",
          amount: 34.9,
          isPaid: false,
          isDenied: false,
          isExpired: false,
          lastUpdate: new Date(Date.now() - 60000).toISOString(),
        },
        {
          externalId: "CHECKOUT_1703123456791_ghi789",
          statusCode: 12,
          statusName: "Pagamento Negado",
          amount: 34.9,
          isPaid: false,
          isDenied: true,
          isExpired: false,
          lastUpdate: new Date(Date.now() - 120000).toISOString(),
        },
      ]

      setWebhooks(mockWebhooks)
      setLastUpdate(new Date().toISOString())
      setIsLoading(false)
    }

    loadWebhooks()

    // Atualizar a cada 5 segundos
    const interval = setInterval(loadWebhooks, 5000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (webhook: WebhookData) => {
    if (webhook.isPaid) return "text-green-600 bg-green-50"
    if (webhook.isDenied) return "text-red-600 bg-red-50"
    if (webhook.isExpired) return "text-orange-600 bg-orange-50"
    return "text-blue-600 bg-blue-50"
  }

  const getStatusIcon = (webhook: WebhookData) => {
    if (webhook.isPaid) return "✅"
    if (webhook.isDenied) return "❌"
    if (webhook.isExpired) return "⏰"
    return "⏳"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR")
  }

  const refreshData = () => {
    setIsLoading(true)
    setTimeout(() => {
      setLastUpdate(new Date().toISOString())
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Monitor de Webhooks SuperPayBR</h1>
          <p className="text-gray-600">Monitoramento em tempo real dos webhooks de pagamento recebidos</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{webhooks.filter((w) => w.isPaid).length}</div>
              <div className="text-sm text-gray-600">Pagamentos Confirmados</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {webhooks.filter((w) => !w.isPaid && !w.isDenied && !w.isExpired).length}
              </div>
              <div className="text-sm text-gray-600">Aguardando Pagamento</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{webhooks.filter((w) => w.isDenied).length}</div>
              <div className="text-sm text-gray-600">Pagamentos Negados</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{webhooks.filter((w) => w.isExpired).length}</div>
              <div className="text-sm text-gray-600">Pagamentos Expirados</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-500">
            Última atualização: {lastUpdate ? formatDate(lastUpdate) : "Nunca"}
          </div>
          <Button onClick={refreshData} disabled={isLoading}>
            {isLoading ? "Atualizando..." : "🔄 Atualizar"}
          </Button>
        </div>

        {/* Webhooks List */}
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                {webhooks.map((webhook, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getStatusIcon(webhook)}</span>
                        <span className="font-mono text-sm text-gray-600">{webhook.externalId}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(webhook)}`}>
                        {webhook.statusName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Valor:</span>
                        <span className="ml-2 font-semibold">R$ {webhook.amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status Code:</span>
                        <span className="ml-2 font-mono">{webhook.statusCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Última Atualização:</span>
                        <span className="ml-2">{formatDate(webhook.lastUpdate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informações de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Endpoint Webhook:</span>
                <code className="ml-2 bg-gray-100 px-2 py-1 rounded">/api/superpaybr/webhook</code>
              </div>
              <div>
                <span className="text-gray-500">Método:</span>
                <code className="ml-2 bg-gray-100 px-2 py-1 rounded">POST</code>
              </div>
              <div>
                <span className="text-gray-500">Rate Limiting:</span>
                <span className="ml-2 text-green-600">✅ Sem limite (crítico)</span>
              </div>
              <div>
                <span className="text-gray-500">Cache Global:</span>
                <span className="ml-2 text-green-600">✅ Ativo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
