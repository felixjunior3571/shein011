"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Activity, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

interface WebhookEvent {
  id: string
  externalId: string
  status: number
  statusTitle: string
  amount: number
  type: string
  received_at: string
  paid: boolean
  cancelled: boolean
  refunded: boolean
}

interface Stats {
  total: number
  paid: number
  pending: number
  cancelled: number
  refunded: number
  totalAmount: number
}

export default function WebhookMonitorPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    paid: 0,
    pending: 0,
    cancelled: 0,
    refunded: 0,
    totalAmount: 0,
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  // Buscar eventos
  const fetchEvents = async () => {
    try {
      setLoading(true)

      // Simular dados para demonstração
      // Em produção, você faria uma chamada real para uma API
      const mockEvents: WebhookEvent[] = [
        {
          id: "1",
          externalId: "SHEIN_1234567890_abc123",
          status: 5,
          statusTitle: "Pagamento Confirmado",
          amount: 34.9,
          type: "PIX",
          received_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          paid: true,
          cancelled: false,
          refunded: false,
        },
        {
          id: "2",
          externalId: "SHEIN_1234567891_def456",
          status: 1,
          statusTitle: "Aguardando Pagamento",
          amount: 29.58,
          type: "PIX",
          received_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          paid: false,
          cancelled: false,
          refunded: false,
        },
        {
          id: "3",
          externalId: "SHEIN_1234567892_ghi789",
          status: 6,
          statusTitle: "Cancelado",
          amount: 27.97,
          type: "PIX",
          received_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          paid: false,
          cancelled: true,
          refunded: false,
        },
      ]

      setEvents(mockEvents)

      // Calcular estatísticas
      const newStats = mockEvents.reduce(
        (acc, event) => {
          acc.total++
          if (event.paid) acc.paid++
          else if (event.cancelled) acc.cancelled++
          else if (event.refunded) acc.refunded++
          else acc.pending++

          if (event.paid) acc.totalAmount += event.amount

          return acc
        },
        { total: 0, paid: 0, pending: 0, cancelled: 0, refunded: 0, totalAmount: 0 },
      )

      setStats(newStats)
      setLastUpdate(new Date().toLocaleString("pt-BR"))
    } catch (error) {
      console.error("Erro ao buscar eventos:", error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar eventos na inicialização
  useEffect(() => {
    fetchEvents()

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [])

  // Formatar data
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR")
  }

  // Obter ícone do status
  const getStatusIcon = (event: WebhookEvent) => {
    if (event.paid) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (event.cancelled) return <XCircle className="w-4 h-4 text-red-500" />
    if (event.refunded) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    return <Clock className="w-4 h-4 text-blue-500" />
  }

  // Obter cor do badge
  const getBadgeVariant = (event: WebhookEvent) => {
    if (event.paid) return "default"
    if (event.cancelled) return "destructive"
    if (event.refunded) return "secondary"
    return "outline"
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monitor de Webhooks</h1>
              <p className="text-gray-600 mt-2">Acompanhe os pagamentos PIX em tempo real</p>
            </div>
            <Button onClick={fetchEvents} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {lastUpdate && <p className="text-sm text-gray-500 mt-2">Última atualização: {lastUpdate}</p>}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Pagos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Pendentes</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Cancelados</p>
                  <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-sm text-gray-600">Total Recebido</p>
                <p className="text-2xl font-bold text-green-600">R$ {stats.totalAmount.toFixed(2).replace(".", ",")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Eventos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Carregando eventos...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum evento encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(event)}
                      <div>
                        <p className="font-medium">{event.externalId}</p>
                        <p className="text-sm text-gray-600">{formatDate(event.received_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">R$ {event.amount.toFixed(2).replace(".", ",")}</p>
                        <p className="text-sm text-gray-600">{event.type}</p>
                      </div>
                      <Badge variant={getBadgeVariant(event)}>{event.statusTitle}</Badge>
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
