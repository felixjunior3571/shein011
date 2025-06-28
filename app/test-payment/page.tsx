"use client"

import { useState } from "react"
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react"

export default function TestPaymentPage() {
  const [externalId, setExternalId] = useState("")
  const [amount, setAmount] = useState("34.90")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const simulatePayment = async () => {
    if (!externalId.trim()) {
      setError("External ID é obrigatório")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/tryplopay/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          externalId: externalId.trim(),
          amount: Number.parseFloat(amount),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || "Erro desconhecido")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na requisição")
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    if (!externalId.trim()) {
      setError("External ID é obrigatório")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tryplopay/payment-status?externalId=${externalId.trim()}`)
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na requisição")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">🧪 Teste de Pagamentos</h1>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">External ID</label>
              <input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="Ex: SHEIN_1234567890_abc123"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-4 mb-6">
            <button
              onClick={simulatePayment}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Simulando...
                </div>
              ) : (
                "🎯 Simular Pagamento"
              )}
            </button>

            <button
              onClick={checkStatus}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Verificando...
                </div>
              ) : (
                "🔍 Verificar Status"
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 font-medium">Erro:</span>
              </div>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium">Resultado:</span>
              </div>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <h3 className="font-medium mb-2">Como usar:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>Digite um External ID (ou use um da página de checkout)</li>
              <li>Clique em "Simular Pagamento" para criar uma confirmação</li>
              <li>Clique em "Verificar Status" para consultar o status</li>
              <li>Vá para a página de checkout para ver o redirecionamento automático</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  )
}
