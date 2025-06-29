"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

interface PaymentConfirmation {
  externalId: string
  invoiceId: string
  token: string
  isPaid: boolean
  isDenied: boolean
  isRefunded: boolean
  isExpired: boolean
  isCanceled: boolean
  statusCode: number
  statusName: string
  amount: number
  paymentDate: string
  receivedAt: string
  gateway: string
  payId: string
}

interface WebhookEvent {
  eventType: string
  timestamp: string
  externalId?: string
  statusCode?: number
  statusName?: string
  error?: string
}

interface WebhookStats {
  total_confirmations: number
  total_events: number
  last_event: WebhookEvent | null
}

export default function SuperPayWebhooksDebugPage() {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async () => {
    try {
      // Buscar confirmações
      const confirmationsResponse = await fetch("/api/superpaybr/payment-status?action=all")
      const confirmationsData = await confirmationsResponse.json()

      if (confirmationsData.success) {
        setConfirmations(confirmationsData.data || [])
      }

      // Buscar eventos
      const eventsResponse = await fetch("/api/superpaybr/payment-status?action=events")
      const eventsData = await eventsResponse.json()

      if (eventsData.success) {
        setEvents(eventsData.data || [])
      }

      // Buscar estatísticas
      const statsResponse = await fetch("/api/superpaybr/webhook?action=stats")
      const statsData = await statsResponse.json()
      setStats(statsData)
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-refresh a cada 5 segundos
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusIcon = (confirmation: PaymentConfirmation) => {
    if (confirmation.isPaid) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (confirmation.isDenied) return <XCircle className="w-4 h-4 text-red-500" />
    if (confirmation.isExpired) return <Clock className="w-4 h-4 text-yellow-500" />
    if (confirmation.isCanceled) return <XCircle className="w-4 h-4 text-gray-500" />
    if (confirmation.isRefunded) return <AlertCircle className="w-4 h-4 text-orange-500" />
    return <Clock className="w-4 h-4 text-blue-500" />
  }

  const getStatusBadge = (confirmation: PaymentConfirmation) => {
    if (confirmation.isPaid) return <Badge className="bg-green-100 text-green-800">Pago</Badge>
    if (confirmation.isDenied) return <Badge className="bg-red-100 text-red-800">Negado</Badge>
    if (confirmation.isExpired) return <Badge className="bg-yellow-100 text-yellow-800">Vencido</Badge>
    if (confirmation.isCanceled) return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>
    if (confirmation.isRefunded) return <Badge className="bg-orange-100 text-orange-800">Estornado</Badge>
    return <Badge className="bg-blue-100 text-blue-800">Pendente</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Carregando dados dos webhooks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">SuperPayBR Webhooks Debug</h1>
            <p className="text-gray-600">Monitoramento em tempo real dos webhooks</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setAutoRefresh(!autoRefresh)} variant={autoRefresh ? "default" : "outline"}>
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Total de Confirmações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_confirmations || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_events || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Último Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {stats?.last_event ? (
                  <>
                    <p className="font-medium">{stats.last_event.eventType}</p>
                    <p className="text-gray-500">{new Date(stats.last_event.timestamp).toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-gray-500">Nenhum evento</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confirmações de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Confirmações de Pagamento</CardTitle>
              <CardDescription>Últimas confirmações recebidas via webhook</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {confirmations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhuma confirmação recebida ainda</p>
                ) : (
                  confirmations.map((confirmation, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(confirmation)}
                          <span className="font-medium">{confirmation.externalId}</span>
                        </div>
                        {getStatusBadge(confirmation)}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Valor:</strong> R$ {confirmation.amount.toFixed(2)}
                        </p>
                        <p>
                          <strong>Status:</strong> {confirmation.statusName} (Code: {confirmation.statusCode})
                        </p>
                        <p>
                          <strong>Token:</strong> {confirmation.token}
                        </p>
                        <p>
                          <strong>Recebido:</strong> {new Date(confirmation.receivedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Eventos em Tempo Real */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos em Tempo Real</CardTitle>
              <CardDescription>Histórico de eventos dos webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhum evento registrado ainda</p>
                ) : (
                  events.map((event, index) => (
                    <div
                      key={index}
                      className={`border-l-4 pl-4 py-2 ${
                        event.eventType === "webhook_received"
                          ? "border-green-400 bg-green-50"
                          : event.eventType === "webhook_error"
                            ? "border-red-400 bg-red-50"
                            : "border-blue-400 bg-blue-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{event.eventType.replace("_", " ").toUpperCase()}</p>
                          {event.externalId && <p className="text-xs text-gray-600">External ID: {event.externalId}</p>}
                          {event.statusName && <p className="text-xs text-gray-600">Status: {event.statusName}</p>}
                          {event.error && <p className="text-xs text-red-600">Erro: {event.error}</p>}
                        </div>
                        <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
