"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react"

interface WebhookEvent {
  id: string
  timestamp: string
  type: string
  externalId: string
  status: any
  processed: boolean
}

export default function WebhookMonitor() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(false)

  // Simular eventos para demonstração
  useEffect(() => {
    const mockEvents: WebhookEvent[] = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        type: "invoice.update",
        externalId: "SHEIN_1234567890_abc123",
        status: { code: 5, title: "Pagamento Confirmado!" },
        processed: true,
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        type: "invoice.update",
        externalId: "SHEIN_1234567891_def456",
        status: { code: 3, title: "Pendente" },
        processed: true,
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: "invoice.update",
        externalId: "SHEIN_1234567892_ghi789",
        status: { code: 1, title: "Aguardando Pagamento" },
        processed: true,
      },
    ]
    setEvents(mockEvents)
  }, [])

  const getStatusIcon = (statusCode: number) => {
    switch (statusCode) {
      case 5:
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 6:
        return <XCircle className="w-4 h-4 text-red-500" />
      case 7:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 3:
        return <Clock className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (statusCode: number) => {
    switch (statusCode) {
      case 5:
        return "bg-green-100 text-green-800"
      case 6:
        return "bg-red-100 text-red-800"
      case 7:
        return "bg-yellow-100 text-yellow-800"
      case 3:
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const refreshEvents = () => {
    setLoading(true)
    // Simular refresh
    setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Monitor de Webhooks TryploPay</CardTitle>
              <Button onClick={refreshEvents} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
            <p className="text-gray-600">Monitoramento em tempo real dos webhooks recebidos</p>
          </CardHeader>

          <CardContent>
            {/* Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-800">Pagos</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {events.filter((e) => e.status.code === 5).length}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-blue-800">Pendentes</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {events.filter((e) => e.status.code === 3).length}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-800">Cancelados</span>
                </div>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {events.filter((e) => e.status.code === 6).length}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-800">Total</span>
                </div>
                <div className="text-2xl font-bold text-gray-600 mt-1">{events.length}</div>
              </div>
            </div>

            {/* Lista de eventos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Eventos Recentes</h3>

              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum webhook recebido ainda</p>
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(event.status.code)}
                          <span className="font-medium">{event.type}</span>
                          <Badge variant="outline" className={getStatusColor(event.status.code)}>
                            {event.status.title}
                          </Badge>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <strong>External ID:</strong> {event.externalId}
                          </div>
                          <div>
                            <strong>Timestamp:</strong> {new Date(event.timestamp).toLocaleString("pt-BR")}
                          </div>
                          <div>
                            <strong>Status Code:</strong> {event.status.code}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {event.processed ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Processado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Informações técnicas */}
            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Informações Técnicas</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <strong>Webhook URL:</strong> {process.env.NEXT_PUBLIC_SITE_URL}/api/tryplopay/webhook
                </div>
                <div>
                  <strong>Eventos Suportados:</strong> invoice.update
                </div>
                <div>
                  <strong>Método:</strong> POST
                </div>
                <div>
                  <strong>Content-Type:</strong> application/json
                </div>
              </div>
            </div>

            {/* Status codes */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium mb-2 text-blue-800">Status Codes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-100">
                    1
                  </Badge>
                  <span>Aguardando Pagamento</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-100">
                    3
                  </Badge>
                  <span>Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100">
                    5
                  </Badge>
                  <span>Pagamento Confirmado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-100">
                    6
                  </Badge>
                  <span>Cancelado</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-yellow-100">
                    7
                  </Badge>
                  <span>Estornado</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
