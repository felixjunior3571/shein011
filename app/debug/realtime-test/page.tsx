"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRealtimePaymentMonitor } from "@/hooks/use-realtime-payment-monitor"
import { Wifi, WifiOff, RefreshCw, Play, Square } from "lucide-react"

export default function RealtimeTestPage() {
  const [testExternalId, setTestExternalId] = useState<string>("")
  const [isTestActive, setIsTestActive] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]) // Manter últimos 50 logs
  }

  const { status, isConnected, error, reconnect, isReady } = useRealtimePaymentMonitor({
    externalId: testExternalId,
    onPaymentConfirmed: (status) => {
      addLog(`🎉 PAGAMENTO CONFIRMADO! Status: ${status.status_code}`)
    },
    onPaymentDenied: (status) => {
      addLog(`❌ PAGAMENTO NEGADO! Status: ${status.status_code}`)
    },
    onPaymentExpired: (status) => {
      addLog(`⏰ PAGAMENTO VENCIDO! Status: ${status.status_code}`)
    },
    onPaymentCanceled: (status) => {
      addLog(`🚫 PAGAMENTO CANCELADO! Status: ${status.status_code}`)
    },
    enabled: isTestActive && !!testExternalId,
    debug: true,
    autoRedirect: false, // Não redirecionar no teste
  })

  const startTest = () => {
    const newExternalId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    setTestExternalId(newExternalId)
    setIsTestActive(true)
    setLogs([])
    addLog(`Iniciando teste com External ID: ${newExternalId}`)
  }

  const stopTest = () => {
    setIsTestActive(false)
    addLog("Teste parado")
  }

  const simulatePayment = async () => {
    if (!testExternalId) return

    try {
      addLog("Simulando pagamento...")

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_id: testExternalId,
          status_code: 5, // Pagamento confirmado
          amount: 27.97,
        }),
      })

      const data = await response.json()

      if (data.success) {
        addLog("✅ Simulação enviada com sucesso!")
      } else {
        addLog(`❌ Erro na simulação: ${data.error}`)
      }
    } catch (error) {
      addLog(`❌ Erro na simulação: ${error}`)
    }
  }

  useEffect(() => {
    if (status) {
      addLog(`Status atualizado: ${status.status_code} - ${status.status_title}`)
    }
  }, [status])

  useEffect(() => {
    if (error) {
      addLog(`❌ Erro: ${error}`)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Teste Realtime SuperPay</h1>
          <p className="text-gray-600">Teste o monitoramento em tempo real sem polling</p>
        </div>

        {/* Controles */}
        <Card>
          <CardHeader>
            <CardTitle>Controles de Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={startTest} disabled={isTestActive} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Iniciar Teste
              </Button>

              <Button
                onClick={stopTest}
                disabled={!isTestActive}
                variant="outline"
                className="flex items-center gap-2 bg-transparent"
              >
                <Square className="h-4 w-4" />
                Parar Teste
              </Button>

              <Button
                onClick={simulatePayment}
                disabled={!isTestActive || !testExternalId}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Simular Pagamento
              </Button>
            </div>

            {testExternalId && (
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-sm font-mono">External ID: {testExternalId}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
                Conexão Realtime
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span>Pronto:</span>
                <Badge variant={isReady ? "default" : "secondary"}>{isReady ? "Sim" : "Carregando..."}</Badge>
              </div>

              {error && (
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600">{error}</p>
                  <Button onClick={reconnect} size="sm" className="mt-2">
                    Reconectar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status do Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {status ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Código:</span>
                    <Badge>{status.status_code}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Título:</span>
                    <span className="text-sm">{status.status_title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pago:</span>
                    <Badge variant={status.is_paid ? "default" : "secondary"}>{status.is_paid ? "Sim" : "Não"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valor:</span>
                    <span className="font-mono">R$ {status.amount?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Nenhum status recebido ainda</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs em Tempo Real</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-500">Nenhum log ainda...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como Testar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                1
              </span>
              <span>Clique em "Iniciar Teste" para gerar um External ID único</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                2
              </span>
              <span>Observe a conexão Realtime sendo estabelecida</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                3
              </span>
              <span>Clique em "Simular Pagamento" para testar o webhook</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-0.5">
                4
              </span>
              <span>Veja o status sendo atualizado instantaneamente via Realtime</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
