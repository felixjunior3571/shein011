"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRealtimePaymentMonitor } from "@/hooks/use-realtime-payment-monitor"
import { Wifi, WifiOff, CheckCircle, XCircle, Clock, AlertTriangle, Activity, Play, Square } from "lucide-react"

export default function RealtimeTestPage() {
  const [externalId, setExternalId] = useState("")
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [simulationStatus, setSimulationStatus] = useState<"idle" | "running" | "success" | "error">("idle")

  // Gerar external_id aleatório
  const generateExternalId = () => {
    const id = `TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    setExternalId(id)
    addLog(`🆔 External ID gerado: ${id}`)
  }

  // Adicionar log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("pt-BR")
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]) // Manter apenas 50 logs
  }

  // Hook do monitor Realtime
  const { isConnected, isConnecting, error, lastUpdate, currentStatus, connectionAttempts, reconnect } =
    useRealtimePaymentMonitor({
      externalId: isMonitoring ? externalId : null,
      enabled: isMonitoring && !!externalId,
      onPaymentConfirmed: (payment) => {
        addLog(`🎉 PAGAMENTO CONFIRMADO! Valor: R$ ${payment.amount}`)
        setSimulationStatus("success")
      },
      onPaymentDenied: (payment) => {
        addLog(`❌ PAGAMENTO NEGADO! Status: ${payment.status_title}`)
        setSimulationStatus("error")
      },
      onPaymentExpired: (payment) => {
        addLog(`⏰ PAGAMENTO VENCIDO! Status: ${payment.status_title}`)
        setSimulationStatus("error")
      },
      onPaymentCanceled: (payment) => {
        addLog(`🚫 PAGAMENTO CANCELADO! Status: ${payment.status_title}`)
        setSimulationStatus("error")
      },
      debug: true,
      autoRedirect: false, // Não redirecionar na página de teste
    })

  // Iniciar monitoramento
  const startMonitoring = () => {
    if (!externalId) {
      addLog("❌ External ID é obrigatório")
      return
    }

    setIsMonitoring(true)
    setSimulationStatus("idle")
    addLog(`🚀 Iniciando monitoramento para: ${externalId}`)
  }

  // Parar monitoramento
  const stopMonitoring = () => {
    setIsMonitoring(false)
    setSimulationStatus("idle")
    addLog("⏹️ Monitoramento parado")
  }

  // Simular pagamento
  const simulatePayment = async (statusCode: number) => {
    if (!externalId) {
      addLog("❌ External ID é obrigatório para simulação")
      return
    }

    setSimulationStatus("running")
    addLog(`🧪 Simulando pagamento com status ${statusCode}...`)

    try {
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

      const data = await response.json()

      if (data.success) {
        addLog(`✅ Simulação enviada com sucesso!`)
        addLog(`📡 Aguardando webhook via Realtime...`)
      } else {
        addLog(`❌ Erro na simulação: ${data.error}`)
        setSimulationStatus("error")
      }
    } catch (error) {
      addLog(`❌ Erro na simulação: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
      setSimulationStatus("error")
    }
  }

  // Limpar logs
  const clearLogs = () => {
    setLogs([])
    addLog("🧹 Logs limpos")
  }

  // Efeitos para logging
  useEffect(() => {
    if (isConnecting) {
      addLog("🔄 Conectando ao Realtime...")
    }
  }, [isConnecting])

  useEffect(() => {
    if (isConnected) {
      addLog("✅ Conectado ao Realtime com sucesso!")
    }
  }, [isConnected])

  useEffect(() => {
    if (error) {
      addLog(`❌ Erro no Realtime: ${error}`)
    }
  }, [error])

  useEffect(() => {
    if (currentStatus) {
      addLog(`📊 Status atualizado: ${currentStatus.status_code} - ${currentStatus.status_title}`)
    }
  }, [currentStatus])

  // Ícone de status da conexão
  const getConnectionIcon = () => {
    if (isConnecting) return <Activity className="h-5 w-5 animate-spin text-blue-500" />
    if (isConnected) return <Wifi className="h-5 w-5 text-green-500" />
    if (error) return <WifiOff className="h-5 w-5 text-red-500" />
    return <WifiOff className="h-5 w-5 text-gray-400" />
  }

  // Badge de status da conexão
  const getConnectionBadge = () => {
    if (isConnecting) return <Badge variant="outline">Conectando...</Badge>
    if (isConnected) return <Badge className="bg-green-500">Conectado</Badge>
    if (error) return <Badge variant="destructive">Erro</Badge>
    return <Badge variant="secondary">Desconectado</Badge>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Teste Realtime SuperPay</h1>
          <p className="text-gray-600">Sistema de monitoramento em tempo real via Supabase WebSocket</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controles */}
          <div className="space-y-6">
            {/* Configuração */}
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Teste</CardTitle>
                <CardDescription>Configure o External ID para monitoramento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="External ID (ex: TEST_123456)"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={generateExternalId} variant="outline">
                    Gerar ID
                  </Button>
                </div>

                <div className="flex space-x-2">
                  {!isMonitoring ? (
                    <Button onClick={startMonitoring} disabled={!externalId} className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Monitoramento
                    </Button>
                  ) : (
                    <Button onClick={stopMonitoring} variant="destructive" className="flex-1">
                      <Square className="h-4 w-4 mr-2" />
                      Parar Monitoramento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status da Conexão */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getConnectionIcon()}
                  Status da Conexão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status:</span>
                  {getConnectionBadge()}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Monitorando:</span>
                  <Badge variant={isMonitoring ? "default" : "secondary"}>{isMonitoring ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tentativas:</span>
                  <span className="text-sm">{connectionAttempts}</span>
                </div>
                {lastUpdate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Última atualização:</span>
                    <span className="text-sm">{new Date(lastUpdate).toLocaleTimeString("pt-BR")}</span>
                  </div>
                )}

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Erro de conexão:</strong> {error}
                      <Button onClick={reconnect} variant="outline" size="sm" className="ml-2 bg-transparent">
                        Reconectar
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Simulações */}
            <Card>
              <CardHeader>
                <CardTitle>Simulações de Pagamento</CardTitle>
                <CardDescription>Teste diferentes status de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => simulatePayment(5)}
                  disabled={!externalId || simulationStatus === "running"}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Simular Pagamento Aprovado (Status 5)
                </Button>

                <Button
                  onClick={() => simulatePayment(6)}
                  disabled={!externalId || simulationStatus === "running"}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Simular Pagamento Negado (Status 6)
                </Button>

                <Button
                  onClick={() => simulatePayment(9)}
                  disabled={!externalId || simulationStatus === "running"}
                  variant="outline"
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Simular Pagamento Vencido (Status 9)
                </Button>

                <Button
                  onClick={() => simulatePayment(10)}
                  disabled={!externalId || simulationStatus === "running"}
                  variant="outline"
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Simular Pagamento Cancelado (Status 10)
                </Button>

                {simulationStatus === "running" && (
                  <div className="flex items-center justify-center space-x-2 text-blue-600">
                    <Activity className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processando simulação...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Atual */}
            {currentStatus && (
              <Card>
                <CardHeader>
                  <CardTitle>Status Atual do Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">External ID:</span>
                    <span className="text-sm font-mono">{currentStatus.external_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status Code:</span>
                    <Badge variant="outline">{currentStatus.status_code}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Status:</span>
                    <span className="text-sm font-semibold">{currentStatus.status_title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Valor:</span>
                    <span className="text-sm font-bold text-green-600">R$ {currentStatus.amount.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${currentStatus.is_paid ? "bg-green-500" : "bg-gray-300"}`}
                      />
                      <span className="text-xs">Pago</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${currentStatus.is_denied ? "bg-red-500" : "bg-gray-300"}`}
                      />
                      <span className="text-xs">Negado</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${currentStatus.is_expired ? "bg-orange-500" : "bg-gray-300"}`}
                      />
                      <span className="text-xs">Vencido</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full ${currentStatus.is_canceled ? "bg-yellow-500" : "bg-gray-300"}`}
                      />
                      <span className="text-xs">Cancelado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Logs */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Logs em Tempo Real</CardTitle>
                  <Button onClick={clearLogs} variant="outline" size="sm">
                    Limpar
                  </Button>
                </div>
                <CardDescription>Acompanhe os eventos do sistema em tempo real</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="text-gray-500 text-center mt-8">
                      Nenhum log ainda...
                      <br />
                      Inicie o monitoramento para ver os eventos
                    </div>
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
          </div>
        </div>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como usar este teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>
              1. <strong>Gere um External ID</strong> ou digite um personalizado
            </p>
            <p>
              2. <strong>Inicie o monitoramento</strong> para conectar ao Realtime
            </p>
            <p>
              3. <strong>Simule um pagamento</strong> usando os botões de simulação
            </p>
            <p>
              4. <strong>Observe os logs</strong> para ver os eventos em tempo real
            </p>
            <p>
              5. <strong>Verifique o status</strong> atualizado automaticamente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
