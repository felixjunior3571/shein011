"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react"

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
  paymentDate: string | null
  pixCode?: string
  qrCodeUrl?: string
  receivedAt: string
}

interface RealtimeEvent {
  timestamp: string
  type: string
  data: PaymentConfirmation
}

export default function SuperPayWebhooksDebugPage() {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([])
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      // Buscar todas as confirmações
      const confirmationsResponse = await fetch("/api/superpaybr/payment-status?action=all")
      const confirmationsData = await confirmationsResponse.json()

      // Buscar eventos em tempo real
      const eventsResponse = await fetch("/api/superpaybr/payment-status?action=events")
      const eventsData = await eventsResponse.json()

      if (confirmationsData.success) {
        setConfirmations(confirmationsData.data || [])
      }

      if (eventsData.success) {
        setEvents(eventsData.data || [])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Auto-refresh a cada 5 segundos
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (confirmation: PaymentConfirmation) => {
    if (confirmation.isPaid) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (confirmation.isDenied) return <XCircle className="w-5 h-5 text-red-500" />
    if (confirmation.isExpired) return <Clock className="w-5 h-5 text-yellow-500" />
    if (confirmation.isCanceled) return <XCircle className="w-5 h-5 text-gray-500" />
    if (confirmation.isRefunded) return <AlertTriangle className="w-5 h-5 text-orange-500" />
    return <Clock className="w-5 h-5 text-blue-500" />
  }

  const getStatusColor = (confirmation: PaymentConfirmation) => {
    if (confirmation.isPaid) return "bg-green-100 text-green-800 border-green-300"
    if (confirmation.isDenied) return "bg-red-100 text-red-800 border-red-300"
    if (confirmation.isExpired) return "bg-yellow-100 text-yellow-800 border-yellow-300"
    if (confirmation.isCanceled) return "bg-gray-100 text-gray-800 border-gray-300"
    if (confirmation.isRefunded) return "bg-orange-100 text-orange-800 border-orange-300"
    return "bg-blue-100 text-blue-800 border-blue-300"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SuperPayBR Webhooks Debug</h1>
              <p className="text-gray-600 mt-1">Monitoramento em tempo real de webhooks e confirmações de pagamento</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>
          {lastUpdate && (
            <p className="text-sm text-gray-500 mt-2">Última atualização: {lastUpdate.toLocaleString()}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confirmações de Pagamento */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmações de Pagamento ({confirmations.length})</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : confirmations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma confirmação encontrada</p>
                <p className="text-sm mt-1">Webhooks aparecerão aqui quando recebidos</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {confirmations.map((confirmation, index) => (
                  <div
                    key={`${confirmation.externalId}-${index}`}
                    className={`border rounded-lg p-4 ${getStatusColor(confirmation)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(confirmation)}
                        <div>
                          <p className="font-medium">{confirmation.statusName}</p>
                          <p className="text-sm opacity-75">External ID: {confirmation.externalId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">R$ {confirmation.amount.toFixed(2)}</p>
                        <p className="text-xs opacity-75">{new Date(confirmation.receivedAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="font-medium">Invoice ID:</span>
                        <p className="truncate">{confirmation.invoiceId}</p>
                      </div>
                      <div>
                        <span className="font-medium">Status Code:</span>
                        <p>{confirmation.statusCode}</p>
                      </div>
                      <div>
                        <span className="font-medium">Token:</span>
                        <p className="truncate">{confirmation.token}</p>
                      </div>
                      <div>
                        <span className="font-medium">Data Pagamento:</span>
                        <p>{confirmation.paymentDate ? new Date(confirmation.paymentDate).toLocaleString() : "N/A"}</p>
                      </div>
                    </div>

                    {/* Estados booleanos */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {confirmation.isPaid && (
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded">Pago</span>
                      )}
                      {confirmation.isDenied && (
                        <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded">Negado</span>
                      )}
                      {confirmation.isExpired && (
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">Vencido</span>
                      )}
                      {confirmation.isCanceled && (
                        <span className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">Cancelado</span>
                      )}
                      {confirmation.isRefunded && (
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded">Estornado</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Eventos em Tempo Real */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Eventos em Tempo Real ({events.length})</h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum evento encontrado</p>
                <p className="text-sm mt-1">Eventos aparecerão aqui em tempo real</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events.map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(event.data)}
                        <span className="font-medium text-sm">{event.type}</span>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                    </div>

                    <div className="text-sm">
                      <p>
                        <strong>External ID:</strong> {event.data.externalId}
                      </p>
                      <p>
                        <strong>Status:</strong> {event.data.statusName}
                      </p>
                      <p>
                        <strong>Valor:</strong> R$ {event.data.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Estatísticas</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{confirmations.filter((c) => c.isPaid).length}</div>
              <div className="text-sm text-gray-600">Pagos</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{confirmations.filter((c) => c.isDenied).length}</div>
              <div className="text-sm text-gray-600">Negados</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {confirmations.filter((c) => c.isExpired).length}
              </div>
              <div className="text-sm text-gray-600">Vencidos</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{confirmations.filter((c) => c.isCanceled).length}</div>
              <div className="text-sm text-gray-600">Cancelados</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {confirmations.filter((c) => c.isRefunded).length}
              </div>
              <div className="text-sm text-gray-600">Estornados</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">
                R$ {confirmations.reduce((total, c) => total + (c.isPaid ? c.amount : 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Recebido</div>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Como usar este debug</h3>
          <div className="text-blue-800 text-sm space-y-2">
            <p>• Esta página monitora webhooks SuperPayBR em tempo real</p>
            <p>• Confirmações aparecem quando webhooks são recebidos no endpoint /api/superpaybr/webhook</p>
            <p>• Status críticos (Pago, Negado, Vencido, Cancelado, Estornado) são destacados</p>
            <p>• A página atualiza automaticamente a cada 5 segundos</p>
            <p>• Use o botão "Atualizar" para forçar uma atualização manual</p>
          </div>
        </div>
      </div>
    </div>
  )
}
