"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SuperPayWebhookTestPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const testWebhook = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log("🧪 Iniciando teste de webhook SuperPay...")

      const response = await fetch("/api/superpay/test-webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        console.log("✅ Teste concluído:", data)
      } else {
        setError(data.message || "Erro no teste")
        console.error("❌ Erro no teste:", data)
      }
    } catch (err) {
      setError(err.message)
      console.error("💥 Erro:", err)
    } finally {
      setLoading(false)
    }
  }

  const testStatusCheck = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔍 Testando verificação de status...")

      const response = await fetch("/api/verifica-status-superpay?token=Z2VyaGFyZG9zCg==")
      const data = await response.json()

      console.log("📊 Status response:", data)
      setResult({ status_check: data })
    } catch (err) {
      setError(err.message)
      console.error("💥 Erro:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">SuperPay Webhook Test</h1>
        <p className="text-gray-600">Teste o sistema de webhook da SuperPay com payload real</p>
      </div>

      <div className="grid gap-6">
        {/* Controles de Teste */}
        <Card>
          <CardHeader>
            <CardTitle>Testes Disponíveis</CardTitle>
            <CardDescription>Execute testes do sistema de webhook</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testWebhook} disabled={loading} className="flex-1">
                {loading ? "Testando..." : "🔔 Testar Webhook"}
              </Button>
              <Button onClick={testStatusCheck} disabled={loading} variant="outline" className="flex-1 bg-transparent">
                {loading ? "Verificando..." : "🔍 Testar Status"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fluxo de Redirecionamento */}
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Redirecionamento</CardTitle>
            <CardDescription>Como funciona o redirecionamento baseado no tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="default">checkout</Badge>
                <span className="text-sm">
                  <code>/checkout</code> → quando pago → redireciona para <code>/upp/001</code>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">activation</Badge>
                <span className="text-sm">
                  <code>/upp/checkout</code> → quando pago → redireciona para <code>/upp10</code>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">✅ Resultado do Teste</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        {/* Erro */}
        {error && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">❌ Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Payload de Exemplo */}
        <Card>
          <CardHeader>
            <CardTitle>Payload SuperPay Real</CardTitle>
            <CardDescription>Estrutura do webhook que a SuperPay envia</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
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
      </div>
    </div>
  )
}
