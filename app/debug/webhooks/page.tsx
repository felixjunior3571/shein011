"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

interface PaymentConfirmation {
  externalId: string
  invoiceId: string
  token: string | null
  isPaid: boolean
  isRefunded: boolean
  isDenied: boolean
  isExpired: boolean
  isCanceled: boolean
  amount: number
  paymentDate: string | null
  statusCode: number
  statusName: string
  statusDescription: string
  receivedAt: string
}

export default function WebhookDebugPage() {
  const [confirmations, setConfirmations] = useState<PaymentConfirmation[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"confirmations" | "events">("confirmations")

  const loadConfirmations = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tryplopay/payment-status?action=all")
      const data = await response.json()
      if (data.success) {
        setConfirmations(data.data || [])
      }
    } catch (error) {
      console.error("Erro ao carregar confirmações:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/tryplopay/payment-status?action=events")
      const data = await response.json()
      if (data.success) {
        setEvents(data.data || [])
      }
    } catch (error) {
      console.error("Erro ao carregar eventos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfirmations()
    loadEvents()

    // Auto-refresh a cada 5 segundos
    const interval = setInterval(() => {
      if (activeTab === "confirmations") {
        loadConfirmations()
      } else {
        loadEvents()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [activeTab])

  const getStatusIcon = (confirmation: PaymentConfirmation) => {
    if (confirmation.isPaid) return <CheckCircle className="w-5 h-5 text-green-500" />
    if (confirmation.isDenied) return <XCircle className="w-5 h-5 text-red-500" />
    if (confirmation.isExpired) return <Clock className="w-5 h-5 text-yellow-500" />
    if (confirmation.isCanceled) return <XCircle className="w-5 h-5 text-gray-500" />
    if (confirmation.isRefunded) return <AlertCircle className="w-5 h-5 text-orange-500" />
    return <Clock className="w-5 h-5 text-blue-500" />
  }

  const getStatusColor = (confirmation: PaymentConfirmation) => {
    if (confirmation.isPaid) return "bg-green-50 border-green-200"
    if (confirmation.isDenied) return "bg-red-50 border-red-200"
    if (confirmation.isExpired) return "bg-yellow-50 border-yellow-200"
    if (confirmation.isCanceled) return "bg-gray-50 border-gray-200"
    if (confirmation.isRefunded) return "bg-orange-50 border-orange-200"
    return "bg-blue-50 border-blue-200"
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Debug - Webhooks TryploPay</h1>
            <button
              onClick={activeTab === "confirmations" ? loadConfirmations : loadEvents}
              disabled={loading}
              className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-black/90 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab("confirmations")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === "confirmations" ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Confirmações ({confirmations.length})
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === "events" ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Eventos ({events.length})
            </button>
          </div>

          {/* Content */}
          {activeTab === "confirmations" ? (
            <div className="space-y-4">
              {confirmations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma confirmação recebida ainda</p>
                  <p className="text-sm">Os webhooks aparecerão aqui quando forem processados</p>
                </div>
              ) : (
                confirmations.map((confirmation, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getStatusColor(confirmation)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(confirmation)}
                        <div>
                          <h3 className="font-semibold text-lg">
                            {confirmation.statusName} ({confirmation.statusCode})
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">{confirmation.statusDescription}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">External ID:</span>
                              <br />
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{confirmation.externalId}</code>
                            </div>
                            <div>
                              <span className="font-medium">Invoice ID:</span>
                              <br />
                              <code className="bg-gray-100 px-2 py-1 rounded text-xs">{confirmation.invoiceId}</code>
                            </div>
                            <div>
                              <span className="font-medium">Valor:</span>
                              <br />
                              <span className="text-green-600 font-bold">R$ {confirmation.amount.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="font-medium">Recebido:</span>
                              <br />
                              <span>{new Date(confirmation.receivedAt).toLocaleString()}</span>
                            </div>
                          </div>
                          {confirmation.paymentDate && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Data Pagamento:</span>
                              <br />
                              <span>{new Date(confirmation.paymentDate).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col space-y-1 text-xs">
                          <span
                            className={`px-2 py-1 rounded ${confirmation.isPaid ? "bg-green-100 text-green-800" : "bg-gray-100"}`}
                          >
                            {confirmation.isPaid ? "✅ Pago" : "⏳ Pendente"}
                          </span>
                          {confirmation.isDenied && (
                            <span className="px-2 py-1 rounded bg-red-100 text-red-800">❌ Negado</span>
                          )}
                          {confirmation.isRefunded && (
                            <span className="px-2 py-1 rounded bg-orange-100 text-orange-800">🔄 Estornado</span>
                          )}
                          {confirmation.isExpired && (
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">⏰ Vencido</span>
                          )}
                          {confirmation.isCanceled && (
                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">🚫 Cancelado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento registrado ainda</p>
                </div>
              ) : (
                events.map((event, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium">{event.type}</span>
                      <span className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
