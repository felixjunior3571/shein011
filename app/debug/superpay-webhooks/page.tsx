"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface WebhookData {
  id: number
  external_id: string
  invoice_id: string
  token?: string
  status_code: number
  status_title: string
  status_description?: string
  status_text: string
  amount: number
  payment_date?: string
  payment_due?: string
  payment_gateway?: string
  qr_code?: string
  processed_at: string
  updated_at: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  gateway: string
  webhook_data?: any
}

export default function SuperPayWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGateway, setSelectedGateway] = useState<"all" | "superpaybr" | "superpay">("all")
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null)

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from("payment_webhooks").select("*")

      if (selectedGateway !== "all") {
        query = query.eq("gateway", selectedGateway)
      }

      query = query.order("processed_at", { ascending: false }).limit(50)

      const { data, error: dbError } = await query

      if (dbError) {
        throw dbError
      }

      setWebhooks(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
      setError(errorMessage)
      console.error("❌ Erro ao carregar webhooks:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [selectedGateway])

  const getStatusBadge = (webhook: WebhookData) => {
    if (webhook.is_paid) return "✅ Pago"
    if (webhook.is_denied) return "❌ Negado"
    if (webhook.is_expired) return "⏰ Vencido"
    if (webhook.is_canceled) return "🚫 Cancelado"
    if (webhook.is_refunded) return "🔄 Estornado"
    return "⏳ Pendente"
  }

  const getStatusColor = (webhook: WebhookData) => {
    if (webhook.is_paid) return "text-green-600 bg-green-100"
    if (webhook.is_denied) return "text-red-600 bg-red-100"
    if (webhook.is_expired) return "text-yellow-600 bg-yellow-100"
    if (webhook.is_canceled) return "text-gray-600 bg-gray-100"
    if (webhook.is_refunded) return "text-blue-600 bg-blue-100"
    return "text-orange-600 bg-orange-100"
  }

  const simulatePayment = async (externalId: string, gateway: string) => {
    try {
      const endpoint = gateway === "superpaybr" ? "/api/superpaybr/simulate-payment" : "/api/superpay/simulate-payment"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          status_code: 5,
          amount: 27.97,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(`✅ Pagamento simulado com sucesso para ${externalId}`)
        loadWebhooks() // Recarregar lista
      } else {
        alert(`❌ Erro na simulação: ${result.message}`)
      }
    } catch (error) {
      alert(`❌ Erro na simulação: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando webhooks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Erro ao carregar webhooks</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadWebhooks}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Debug SuperPay Webhooks</h1>
            <button
              onClick={loadWebhooks}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Recarregar
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Gateway:</label>
            <select
              value={selectedGateway}
              onChange={(e) => setSelectedGateway(e.target.value as "all" | "superpaybr" | "superpay")}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Gateways</option>
              <option value="superpaybr">SuperPayBR</option>
              <option value="superpay">SuperPay</option>
            </select>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-600 font-bold text-2xl">{webhooks.filter((w) => w.is_paid).length}</div>
              <div className="text-green-700 text-sm">Pagamentos Confirmados</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-600 font-bold text-2xl">{webhooks.filter((w) => w.is_denied).length}</div>
              <div className="text-red-700 text-sm">Pagamentos Negados</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-yellow-600 font-bold text-2xl">{webhooks.filter((w) => w.is_expired).length}</div>
              <div className="text-yellow-700 text-sm">Pagamentos Vencidos</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-blue-600 font-bold text-2xl">{webhooks.length}</div>
              <div className="text-blue-700 text-sm">Total de Webhooks</div>
            </div>
          </div>

          {/* Lista de Webhooks */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    External ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gateway
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{webhook.external_id}</div>
                      <div className="text-sm text-gray-500">ID: {webhook.invoice_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          webhook.gateway === "superpaybr"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-indigo-100 text-indigo-800"
                        }`}
                      >
                        {webhook.gateway.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(webhook)}`}
                      >
                        {getStatusBadge(webhook)}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">Código: {webhook.status_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {webhook.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(webhook.processed_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => setSelectedWebhook(webhook)} className="text-blue-600 hover:text-blue-900">
                        Ver Detalhes
                      </button>
                      {!webhook.is_paid && (
                        <button
                          onClick={() => simulatePayment(webhook.external_id, webhook.gateway)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Simular Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {webhooks.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum webhook encontrado</h3>
              <p className="text-gray-500">
                {selectedGateway === "all"
                  ? "Não há webhooks registrados ainda."
                  : `Não há webhooks do gateway ${selectedGateway.toUpperCase()}.`}
              </p>
            </div>
          )}
        </div>

        {/* Modal de Detalhes */}
        {selectedWebhook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Detalhes do Webhook</h2>
                  <button onClick={() => setSelectedWebhook(null)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">External ID</dt>
                        <dd className="text-sm text-gray-900">{selectedWebhook.external_id}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Invoice ID</dt>
                        <dd className="text-sm text-gray-900">{selectedWebhook.invoice_id}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Gateway</dt>
                        <dd className="text-sm text-gray-900">{selectedWebhook.gateway.toUpperCase()}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd className="text-sm text-gray-900">
                          {selectedWebhook.status_title} (Código: {selectedWebhook.status_code})
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Valor</dt>
                        <dd className="text-sm text-gray-900">R$ {selectedWebhook.amount.toFixed(2)}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Data de Processamento</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(selectedWebhook.processed_at).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Status Flags</h3>
                    <div className="space-y-2">
                      <div
                        className={`flex items-center space-x-2 ${selectedWebhook.is_paid ? "text-green-600" : "text-gray-400"}`}
                      >
                        <span>{selectedWebhook.is_paid ? "✅" : "❌"}</span>
                        <span>Pago</span>
                      </div>
                      <div
                        className={`flex items-center space-x-2 ${selectedWebhook.is_denied ? "text-red-600" : "text-gray-400"}`}
                      >
                        <span>{selectedWebhook.is_denied ? "✅" : "❌"}</span>
                        <span>Negado</span>
                      </div>
                      <div
                        className={`flex items-center space-x-2 ${selectedWebhook.is_expired ? "text-yellow-600" : "text-gray-400"}`}
                      >
                        <span>{selectedWebhook.is_expired ? "✅" : "❌"}</span>
                        <span>Vencido</span>
                      </div>
                      <div
                        className={`flex items-center space-x-2 ${selectedWebhook.is_canceled ? "text-gray-600" : "text-gray-400"}`}
                      >
                        <span>{selectedWebhook.is_canceled ? "✅" : "❌"}</span>
                        <span>Cancelado</span>
                      </div>
                      <div
                        className={`flex items-center space-x-2 ${selectedWebhook.is_refunded ? "text-blue-600" : "text-gray-400"}`}
                      >
                        <span>{selectedWebhook.is_refunded ? "✅" : "❌"}</span>
                        <span>Estornado</span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedWebhook.webhook_data && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Dados Brutos do Webhook</h3>
                    <pre className="bg-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
                      {JSON.stringify(selectedWebhook.webhook_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
