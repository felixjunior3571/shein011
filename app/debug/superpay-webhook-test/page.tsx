"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SuperPayWebhookTest() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const testWebhook = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/superpay/test-webhook", {
        method: "POST",
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testStatusCheck = async () => {
    setLoading(true)
    try {
      // Usar token de exemplo
      const response = await fetch("/api/verifica-status-superpay?token=Z2VyaGFyZG9zCg==")
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔔 Teste Webhook SuperPay
            <Badge variant="outline">Debug</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testWebhook} disabled={loading} className="flex-1">
              {loading ? "Testando..." : "🧪 Testar Webhook"}
            </Button>

            <Button onClick={testStatusCheck} disabled={loading} variant="outline" className="flex-1 bg-transparent">
              {loading ? "Verificando..." : "🔍 Testar Verificação Status"}
            </Button>
          </div>

          {result && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">{result.success ? "✅ Resultado" : "❌ Erro"}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">📋 Payload de Exemplo</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
                {`{
  "event": {
    "type": "invoice.update",
    "date": "2024-06-28 19:32:20"
  },
  "invoices": {
    "id": 2583973,
    "external_id": "FRETE_1720867980282_984",
    "token": "Z2VyaGFyZG9zCg==",
    "status": {
      "code": 5,
      "title": "Pagamento Confirmado!",
      "description": "Obrigado pela sua Compra!"
    },
    "payment": {
      "gateway": "gerencianet",
      "payId": "1687715304",
      "payDate": "2024-06-28 19:33:03"
    }
  }
}`}
              </pre>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🎯 Status Codes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>1: Pendente</div>
                <div>2: Processando</div>
                <div>3: Aguardando</div>
                <div>4: Em Análise</div>
                <div className="font-bold text-green-600">5: Pago ✅</div>
                <div className="text-red-600">6: Recusado ❌</div>
                <div className="text-red-600">7: Cancelado ❌</div>
                <div className="text-red-600">8: Estornado ❌</div>
                <div className="text-red-600">9: Vencido ❌</div>
                <div className="text-red-600">10: Contestado ❌</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">🔗 Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div>POST /api/superpay/webhook</div>
                <div>GET /api/verifica-status-superpay</div>
                <div>POST /api/superpay/test-webhook</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
