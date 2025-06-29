"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Activity, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

interface WebhookEvent {
  external_id: string
  invoice_id: string
  status_code: number
  status_description: string
  amount: number
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  received_at: string
  gateway: string
}

export default function SuperpayWebhooksDebugPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchWebhookData = async () => {
    try {
      setIsLoading(true)

      // Buscar eventos
      const eventsResponse = await fetch("/api/superpaybr/payment-status?action=events")
      const eventsData = await eventsResponse.json()

      // Buscar estatísticas
      const statsResponse = await fetch("/api/superpaybr/webhook?action=stats")
      const statsData = await statsResponse.json()

      if (eventsData.success) {
        setEvents(eventsData.data || [])
      }

      setStats(statsData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhookData()

    // Auto-refresh a cada 5 segundos
    const interval = setInterval(fetchWebhookData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (event: WebhookEvent) => {
    if (event.is_paid) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Pago
        </Badge>
      )
    }
    if (event.is_denied) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Negado
        </Badge>
      )
    }
    if (event.is_expired) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Vencido
        </Badge>
      )
    }
    if (event.is_canceled) {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelado
        </Badge>
      )
    }
    if (event.is_refunded) {
      return (
        <Badge className="bg-orange-100 text-orange-800">
          <RefreshCw className="w-3 h-3 mr-1" />
          Estornado
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-100 text-blue-800">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SuperPayBR Webhooks Debug</h1>
              <p className="text-gray-600 mt-2">Monitoramento em tempo real dos webhooks SuperPayBR</p>
            </div>
            <Button onClick={fetchWebhookData} disabled={isLoading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Webhooks</p>
                  <p className="text-2xl font-bold text-gray-900">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pagamentos Confirmados</p>
                  <p className="text-2xl font-bold text-gray-900">{events.filter((e) => e.is_paid).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pagamentos Negados</p>
                  <p className="text-2xl font-bold text-gray-900">{events.filter((e) => e.is_denied).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Última Atualização</p>
                  <p className="text-sm font-bold text-gray-900">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : "Nunca"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Eventos Recentes ({events.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum webhook recebido ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(event)}
                        <span className="font-mono text-sm text-gray-600">#{event.external_id}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(event.received_at).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Status Code</p>
                        <p className="text-gray-900">{event.status_code}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Valor</p>
                        <p className="text-gray-900">R$ {event.amount?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Gateway</p>
                        <p className="text-gray-900">{event.gateway}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Invoice ID</p>
                        <p className="text-gray-900 font-mono text-xs">{event.invoice_id}</p>
                      </div>
                    </div>

                    <div className="mt-2">
                      <p className="font-medium text-gray-700 text-sm">Status</p>
                      <p className="text-gray-900">{event.status_description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700">Endpoint Webhook</p>
                <p className="text-gray-900 font-mono">/api/superpaybr/webhook</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Status API</p>
                <p className="text-green-600">✅ Ativo</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Última Verificação</p>
                <p className="text-gray-900">{lastUpdate ? lastUpdate.toLocaleString("pt-BR") : "Nunca"}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Auto-refresh</p>
                <p className="text-gray-900">A cada 5 segundos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
