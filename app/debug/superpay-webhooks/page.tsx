"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface WebhookEvent {
  type: string
  timestamp: string
  statusCode?: number
  statusName?: string
  externalId?: string
  invoiceId?: number
  amount?: number
  payId?: string
  isPaid?: boolean
  isRefunded?: boolean
  isDenied?: boolean
  isExpired?: boolean
  isCanceled?: boolean
  isCritical?: boolean
  error?: string
}

interface WebhookStats {
  total_received: number
  processed: number
  payments_confirmed: number
  recent_events: WebhookEvent[]
  recent_webhooks: any[]
}

export default function SuperPayWebhooksDebugPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/superpay/webhook")
      const data = await response.json()

      setStats(data.statistics)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Atualizar a cada 5 segundos
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (event: WebhookEvent) => {
    if (event.error) return <XCircle className="w-4 h-4 text-red-500" />
    if (event.isPaid) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (event.isDenied) return <XCircle className="w-4 h-4 text-red-500" />
    if (event.isExpired) return <Clock className="w-4 h-4 text-yellow-500" />
    if (event.isCanceled) return <AlertTriangle className="w-4 h-4 text-gray-500" />
    if (event.isRefunded) return <RefreshCw className="w-4 h-4 text-orange-500" />
    return <Clock className="w-4 h-4 text-blue-500" />
  }

  const getStatusColor = (event: WebhookEvent) => {
    if (event.error) return "bg-red-100 text-red-800"
    if (event.isPaid) return "bg-green-100 text-green-800"
    if (event.isDenied) return "bg-red-100 text-red-800"
    if (event.isExpired) return "bg-yellow-100 text-yellow-800"
    if (event.isCanceled) return "bg-gray-100 text-gray-800"
    if (event.isRefunded) return "bg-orange-100 text-orange-800"
    return "bg-blue-100 text-blue-800"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2">Carregando estatísticas...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <XCircle className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Erro ao carregar dados</h2>
              <p>{error}</p>
              <Button onClick={fetchStats} className="mt-4">
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Debug SuperPay Webhooks</h1>
        <Button onClick={fetchStats} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Webhooks Recebidos</CardTitle>
            <CardDescription>Total de notificações SuperPay</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total_received || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processados</CardTitle>
            <CardDescription>Webhooks processados com sucesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.processed || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos Confirmados</CardTitle>
            <CardDescription>Confirmações salvas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats?.payments_confirmed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Eventos Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
          <CardDescription>Últimos 10 eventos do sistema SuperPay</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_events && stats.recent_events.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_events.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(event)}
                    <div>
                      <div className="font-medium">{event.type}</div>
                      <div className="text-sm text-gray-500">
                        {event.externalId && `ID: ${event.externalId}`}
                        {event.amount && ` • R$ ${event.amount.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(event)}>
                      {event.error ? "Erro" : event.statusName || "Processando"}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento registrado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Recentes</CardTitle>
          <CardDescription>Últimos 5 webhooks recebidos da SuperPay</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_webhooks && stats.recent_webhooks.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_webhooks.map((webhook, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Invoice #{webhook.invoice_id}</div>
                    <div className="text-sm text-gray-500">
                      External ID: {webhook.external_id}
                      <br />
                      Status: {webhook.status_name} (Code: {webhook.status})
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={webhook.processed ? "default" : "secondary"}>
                      {webhook.processed ? "Processado" : "Pendente"}
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(webhook.timestamp).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum webhook registrado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
          <CardDescription>Configurações e status do webhook SuperPay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Endpoint:</strong> /api/superpay/webhook
            </div>
            <div>
              <strong>Método:</strong> POST
            </div>
            <div>
              <strong>Tipo:</strong> 100% Webhook
            </div>
            <div>
              <strong>Polling:</strong> Desabilitado
            </div>
            <div>
              <strong>Armazenamento:</strong> Memória Global
            </div>
            <div>
              <strong>Chaves de Busca:</strong> externalId, invoiceId, token
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
