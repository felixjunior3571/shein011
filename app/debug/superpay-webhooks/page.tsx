"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Webhook, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface WebhookEvent {
  type: string
  timestamp: string
  statusCode?: number
  statusName?: string
  externalId?: string
  amount?: number
  isPaid?: boolean
  isDenied?: boolean
  isExpired?: boolean
  isCanceled?: boolean
  isRefunded?: boolean
  gateway?: string
}

interface WebhookStats {
  total_received: number
  processed: number
  payments_confirmed: number
  recent_events: WebhookEvent[]
  recent_webhooks: any[]
}

export default function SuperPayWebhooksDebug() {
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/superpay/webhook")
      const data = await response.json()
      setStats(data.statistics)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Erro ao buscar estatísticas SuperPay:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Atualizar a cada 5 segundos
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (event: WebhookEvent) => {
    if (event.isPaid) return <CheckCircle className="h-4 w-4 text-green-500" />
    if (event.isDenied) return <XCircle className="h-4 w-4 text-red-500" />
    if (event.isExpired) return <Clock className="h-4 w-4 text-orange-500" />
    if (event.isCanceled) return <XCircle className="h-4 w-4 text-gray-500" />
    if (event.isRefunded) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    return <Clock className="h-4 w-4 text-blue-500" />
  }

  const getStatusBadge = (event: WebhookEvent) => {
    if (event.isPaid)
      return (
        <Badge variant="default" className="bg-green-500">
          Pago
        </Badge>
      )
    if (event.isDenied) return <Badge variant="destructive">Negado</Badge>
    if (event.isExpired)
      return (
        <Badge variant="secondary" className="bg-orange-500">
          Vencido
        </Badge>
      )
    if (event.isCanceled) return <Badge variant="outline">Cancelado</Badge>
    if (event.isRefunded)
      return (
        <Badge variant="secondary" className="bg-yellow-500">
          Estornado
        </Badge>
      )
    return <Badge variant="outline">Aguardando</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Webhook className="h-8 w-8 text-blue-600" />
              SuperPay Webhooks Debug
            </h1>
            <p className="text-gray-600 mt-1">Monitoramento em tempo real do sistema de webhooks SuperPay</p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdate && (
              <span className="text-sm text-gray-500">Última atualização: {lastUpdate.toLocaleTimeString()}</span>
            )}
            <Button onClick={fetchStats} disabled={loading} size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Recebidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.total_received || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Processados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.processed || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pagamentos Confirmados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats?.payments_confirmed || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats?.total_received ? Math.round((stats.processed / stats.total_received) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Eventos Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recentes SuperPay</CardTitle>
            <CardDescription>Últimos eventos de webhook recebidos em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Carregando eventos...</span>
              </div>
            ) : stats?.recent_events && stats.recent_events.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(event)}
                      <div>
                        <div className="font-medium text-sm">
                          {event.type === "webhook_received" ? "Webhook Recebido" : "Erro"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.externalId && `ID: ${event.externalId.slice(-8)}`}
                          {event.amount && ` • R$ ${event.amount.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(event)}
                      <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Webhook className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum evento SuperPay recebido ainda</p>
                <p className="text-sm mt-1">Os webhooks aparecerão aqui quando forem recebidos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Webhooks SuperPay Processados</CardTitle>
            <CardDescription>Histórico detalhado dos webhooks processados</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_webhooks && stats.recent_webhooks.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_webhooks.map((webhook, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">Invoice #{webhook.invoice_id}</div>
                      <div className="text-sm text-gray-600">External ID: {webhook.external_id}</div>
                      <div className="text-xs text-gray-500">{new Date(webhook.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge
                        variant={webhook.processed ? "default" : "secondary"}
                        className={webhook.processed ? "bg-green-500" : ""}
                      >
                        {webhook.processed ? "Processado" : "Pendente"}
                      </Badge>
                      <div className="text-sm text-gray-600">Status: {webhook.status_name || "Desconhecido"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum webhook SuperPay processado ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema SuperPay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Endpoint:</strong> /api/superpay/webhook
              </div>
              <div>
                <strong>Método:</strong> POST
              </div>
              <div>
                <strong>Tipo:</strong> Webhook Only (sem polling)
              </div>
              <div>
                <strong>Armazenamento:</strong> In-Memory Global
              </div>
              <div>
                <strong>Verificação:</strong> A cada 3 segundos
              </div>
              <div>
                <strong>Gateway:</strong> SuperPay
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
