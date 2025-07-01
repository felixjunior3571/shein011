"use client"

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { RefreshCw, Eye, Play, Trash2, Download } from "lucide-react"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

interface WebhookData {
  id: number
  external_id: string
  invoice_id: string
  token: string
  status_code: number
  status_title: string
  status_description: string
  status_text: string
  amount: number
  payment_date: string | null
  payment_due: string | null
  payment_gateway: string
  qr_code: string | null
  webhook_data: any
  processed_at: string
  updated_at: string
  is_paid: boolean
  is_denied: boolean
  is_expired: boolean
  is_canceled: boolean
  is_refunded: boolean
  gateway: string
}

interface Stats {
  total: number
  paid: number
  denied: number
  expired: number
  canceled: number
  refunded: number
  pending: number
  by_gateway: Record<string, number>
  by_status: Record<number, number>
  total_amount: number
  paid_amount: number
}

export default function SuperpayWebhooksDebugPage() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [gatewayFilter, setGatewayFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const loadWebhooks = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔍 Carregando webhooks SuperPay...")

      let query = supabase.from("payment_webhooks").select("*").order("processed_at", { ascending: false }).limit(100)

      // Aplicar filtros
      if (gatewayFilter !== "all") {
        query = query.eq("gateway", gatewayFilter)
      }

      if (filter !== "all") {
        switch (filter) {
          case "paid":
            query = query.eq("is_paid", true)
            break
          case "denied":
            query = query.eq("is_denied", true)
            break
          case "expired":
            query = query.eq("is_expired", true)
            break
          case "canceled":
            query = query.eq("is_canceled", true)
            break
          case "refunded":
            query = query.eq("is_refunded", true)
            break
          case "pending":
            query = query
              .eq("is_paid", false)
              .eq("is_denied", false)
              .eq("is_expired", false)
              .eq("is_canceled", false)
              .eq("is_refunded", false)
            break
        }
      }

      if (searchTerm) {
        query = query.or(`external_id.ilike.%${searchTerm}%,invoice_id.ilike.%${searchTerm}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setWebhooks(data || [])

      // Calcular estatísticas
      const statsData: Stats = {
        total: data?.length || 0,
        paid: data?.filter((w) => w.is_paid).length || 0,
        denied: data?.filter((w) => w.is_denied).length || 0,
        expired: data?.filter((w) => w.is_expired).length || 0,
        canceled: data?.filter((w) => w.is_canceled).length || 0,
        refunded: data?.filter((w) => w.is_refunded).length || 0,
        pending:
          data?.filter((w) => !w.is_paid && !w.is_denied && !w.is_expired && !w.is_canceled && !w.is_refunded).length ||
          0,
        by_gateway: {},
        by_status: {},
        total_amount: data?.reduce((sum, w) => sum + w.amount, 0) || 0,
        paid_amount: data?.filter((w) => w.is_paid).reduce((sum, w) => sum + w.amount, 0) || 0,
      }

      // Agrupar por gateway
      data?.forEach((webhook) => {
        statsData.by_gateway[webhook.gateway] = (statsData.by_gateway[webhook.gateway] || 0) + 1
        statsData.by_status[webhook.status_code] = (statsData.by_status[webhook.status_code] || 0) + 1
      })

      setStats(statsData)

      console.log("✅ Webhooks carregados:", data?.length)
    } catch (err) {
      console.error("❌ Erro ao carregar webhooks:", err)
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  const simulatePayment = async (externalId: string, statusCode = 5) => {
    try {
      console.log(`🧪 Simulando pagamento: ${externalId} com status ${statusCode}`)

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          status_code: statusCode,
          amount: 27.97,
        }),
      })

      const result = await response.json()

      if (result.success) {
        console.log("✅ Simulação executada com sucesso!")
        // Recarregar webhooks após simulação
        setTimeout(() => {
          loadWebhooks()
        }, 1000)
      } else {
        console.error("❌ Erro na simulação:", result.error)
        alert(`Erro na simulação: ${result.error}`)
      }
    } catch (error) {
      console.error("❌ Erro na simulação:", error)
      alert("Erro na simulação")
    }
  }

  const clearWebhooks = async () => {
    if (!confirm("Tem certeza que deseja limpar todos os webhooks? Esta ação não pode ser desfeita.")) {
      return
    }

    try {
      const { error } = await supabase.from("payment_webhooks").delete().neq("id", 0)

      if (error) {
        throw error
      }

      console.log("✅ Webhooks limpos com sucesso!")
      loadWebhooks()
    } catch (error) {
      console.error("❌ Erro ao limpar webhooks:", error)
      alert("Erro ao limpar webhooks")
    }
  }

  const exportWebhooks = () => {
    const csvContent = [
      "ID,External ID,Invoice ID,Status Code,Status Title,Amount,Gateway,Processed At,Is Paid",
      ...webhooks.map((w) =>
        [
          w.id,
          w.external_id,
          w.invoice_id,
          w.status_code,
          w.status_title,
          w.amount,
          w.gateway,
          w.processed_at,
          w.is_paid,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `superpay-webhooks-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadWebhooks()
  }, [filter, gatewayFilter, searchTerm])

  const getStatusColor = (webhook: WebhookData) => {
    if (webhook.is_paid) return "text-green-600 bg-green-100"
    if (webhook.is_denied) return "text-red-600 bg-red-100"
    if (webhook.is_expired) return "text-orange-600 bg-orange-100"
    if (webhook.is_canceled) return "text-gray-600 bg-gray-100"
    if (webhook.is_refunded) return "text-blue-600 bg-blue-100"
    return "text-yellow-600 bg-yellow-100"
  }

  const getStatusIcon = (webhook: WebhookData) => {
    if (webhook.is_paid) return "✅"
    if (webhook.is_denied) return "❌"
    if (webhook.is_expired) return "⏰"
    if (webhook.is_canceled) return "🚫"
    if (webhook.is_refunded) return "🔄"
    return "⏳"
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Debug SuperPay Webhooks</h1>
            <div className="flex space-x-2">
              <button
                onClick={loadWebhooks}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>
              <button
                onClick={exportWebhooks}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={clearWebhooks}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="paid">Pagos</option>
                <option value="denied">Negados</option>
                <option value="expired">Vencidos</option>
                <option value="canceled">Cancelados</option>
                <option value="refunded">Estornados</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gateway:</label>
              <select
                value={gatewayFilter}
                onChange={(e) => setGatewayFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="superpaybr">SuperPayBR</option>
                <option value="superpay">SuperPay</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="External ID ou Invoice ID"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Estatísticas */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-blue-800">Total</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
                <div className="text-sm text-green-800">Pagos</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.denied}</div>
                <div className="text-sm text-red-800">Negados</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
                <div className="text-sm text-orange-800">Vencidos</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{stats.canceled}</div>
                <div className="text-sm text-gray-800">Cancelados</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.refunded}</div>
                <div className="text-sm text-blue-800">Estornados</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-yellow-800">Pendentes</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">R$ {stats.paid_amount.toFixed(2)}</div>
                <div className="text-sm text-purple-800">Valor Pago</div>
              </div>
            </div>
          )}
        </div>

        {/* Simulação Rápida */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Simulação Rápida</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => simulatePayment(`TEST_${Date.now()}`, 5)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              <span>Simular Pago</span>
            </button>
            <button
              onClick={() => simulatePayment(`TEST_${Date.now()}`, 12)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Play className="w-4 h-4" />
              <span>Simular Negado</span>
            </button>
            <button
              onClick={() => simulatePayment(`TEST_${Date.now()}`, 15)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              <Play className="w-4 h-4" />
              <span>Simular Vencido</span>
            </button>
            <button
              onClick={() => simulatePayment(`TEST_${Date.now()}`, 6)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Play className="w-4 h-4" />
              <span>Simular Cancelado</span>
            </button>
          </div>
        </div>

        {/* Lista de Webhooks */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold">Webhooks Recebidos ({webhooks.length})</h2>
          </div>

          {loading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando webhooks...</p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-500">
              <p className="text-red-700">Erro: {error}</p>
            </div>
          )}

          {!loading && !error && webhooks.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p>Nenhum webhook encontrado.</p>
              <p className="text-sm mt-2">Execute uma simulação ou aguarde webhooks reais.</p>
            </div>
          )}

          {!loading && !error && webhooks.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      External ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gateway
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
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(webhook)}`}
                        >
                          {getStatusIcon(webhook)} {webhook.status_title}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{webhook.external_id}</div>
                        <div className="text-sm text-gray-500">ID: {webhook.invoice_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">R$ {webhook.amount.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {webhook.gateway}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(webhook.processed_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedWebhook(webhook)
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Ver</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Detalhes */}
        {showModal && selectedWebhook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Detalhes do Webhook</h3>
                  <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Informações Básicas</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>External ID:</strong> {selectedWebhook.external_id}
                      </div>
                      <div>
                        <strong>Invoice ID:</strong> {selectedWebhook.invoice_id}
                      </div>
                      <div>
                        <strong>Token:</strong> {selectedWebhook.token || "N/A"}
                      </div>
                      <div>
                        <strong>Gateway:</strong> {selectedWebhook.gateway}
                      </div>
                      <div>
                        <strong>Valor:</strong> R$ {selectedWebhook.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Status</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Código:</strong> {selectedWebhook.status_code}
                      </div>
                      <div>
                        <strong>Título:</strong> {selectedWebhook.status_title}
                      </div>
                      <div>
                        <strong>Descrição:</strong> {selectedWebhook.status_description || "N/A"}
                      </div>
                      <div>
                        <strong>Texto:</strong> {selectedWebhook.status_text || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Flags</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Pago:</strong> {selectedWebhook.is_paid ? "✅ Sim" : "❌ Não"}
                      </div>
                      <div>
                        <strong>Negado:</strong> {selectedWebhook.is_denied ? "✅ Sim" : "❌ Não"}
                      </div>
                      <div>
                        <strong>Vencido:</strong> {selectedWebhook.is_expired ? "✅ Sim" : "❌ Não"}
                      </div>
                      <div>
                        <strong>Cancelado:</strong> {selectedWebhook.is_canceled ? "✅ Sim" : "❌ Não"}
                      </div>
                      <div>
                        <strong>Estornado:</strong> {selectedWebhook.is_refunded ? "✅ Sim" : "❌ Não"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Datas</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Processado:</strong> {new Date(selectedWebhook.processed_at).toLocaleString()}
                      </div>
                      <div>
                        <strong>Atualizado:</strong> {new Date(selectedWebhook.updated_at).toLocaleString()}
                      </div>
                      <div>
                        <strong>Pagamento:</strong>{" "}
                        {selectedWebhook.payment_date ? new Date(selectedWebhook.payment_date).toLocaleString() : "N/A"}
                      </div>
                      <div>
                        <strong>Vencimento:</strong>{" "}
                        {selectedWebhook.payment_due ? new Date(selectedWebhook.payment_due).toLocaleString() : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Dados Brutos do Webhook</h4>
                  <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedWebhook.webhook_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
