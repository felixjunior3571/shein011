"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Wifi,
  WifiOff,
  Play,
  Square,
  RotateCcw,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  Terminal,
} from "lucide-react"
import { useRealtimePaymentMonitor } from "@/hooks/use-realtime-payment-monitor"

export default function RealtimeTestPage() {
  const [externalId, setExternalId] = useState(`SHEIN_${Date.now()}_test`)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("5")
  const [isSimulating, setIsSimulating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Hook do monitor Realtime
  const { isConnected, isConnecting, error, lastUpdate, currentStatus, connectionAttempts, reconnect, disconnect } =
    useRealtimePaymentMonitor({
      externalId,
      enabled: isMonitoring,
      onPaymentConfirmed: (payment) => {
        addLog(`🎉 PAGAMENTO CONFIRMADO! Valor: R$ ${payment.amount}`, "success")
      },
      onPaymentDenied: (payment) => {
        addLog(`❌ PAGAMENTO NEGADO! Status: ${payment.status_title}`, "error")
      },
      onPaymentExpired: (payment) => {
        addLog(`⏰ PAGAMENTO VENCIDO! Status: ${payment.status_title}`, "warning")
      },
      onPaymentCanceled: (payment) => {
        addLog(`🚫 PAGAMENTO CANCELADO! Status: ${payment.status_title}`, "warning")
      },
      onStatusChange: (payment) => {
        addLog(`📊 Status atualizado: ${payment.status_code} - ${payment.status_title}`, "info")
      },
    })

  // Função para adicionar logs
  const addLog = (message: string, type: "info" | "success" | "error" | "warning" = "info") => {
    const timestamp = new Date().toLocaleTimeString("pt-BR")
    const logEntry = `[${timestamp}] ${message}`
    setLogs((prev) => [...prev.slice(-49), logEntry]) // Manter apenas os últimos 50 logs
  }

  // Auto-scroll dos logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  // Função para iniciar monitoramento
  const startMonitoring = () => {
    setIsMonitoring(true)
    addLog(`🚀 Iniciando monitoramento Realtime para: ${externalId}`, "info")
  }

  // Função para parar monitoramento
  const stopMonitoring = () => {
    setIsMonitoring(false)
    disconnect()
    addLog(`🛑 Monitoramento parado`, "warning")
  }

  // Função para gerar novo External ID
  const generateNewId = () => {
    const newId = `SHEIN_${Date.now()}_test`
    setExternalId(newId)
    addLog(`🆔 Novo External ID gerado: ${newId}`, "info")
  }

  // Função para simular pagamento
  const simulatePayment = async () => {
    try {
      setIsSimulating(true)
      addLog(`🧪 Simulando pagamento com status ${selectedStatus}...`, "info")

      const response = await fetch("/api/superpaybr/simulate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_id: externalId,
          status_code: Number.parseInt(selectedStatus),
          amount: 27.97,
        }),
      })

      const result = await response.json()

      if (result.success) {
        addLog(`✅ Webhook simulado enviado com sucesso!`, "success")
      } else {
        addLog(`❌ Erro na simulação: ${result.error}`, "error")
      }
    } catch (error) {
      addLog(`❌ Erro na simulação: ${error}`, "error")
    } finally {
      setIsSimulating(false)
    }
  }

  // Função para limpar logs
  const clearLogs = () => {
    setLogs([])
    addLog(`🧹 Logs limpos`, "info")
  }

  // Status codes disponíveis
  const statusCodes = [
    { value: "1", label: "1 - Aguardando Pagamento", color: "gray" },
    { value: "5", label: "5 - Pagamento Confirmado", color: "green" },
    { value: "6", label: "6 - Pagamento Negado", color: "red" },
    { value: "9", label: "9 - Vencido", color: "orange" },
    { value: "10", label: "10 - Cancelado", color: "yellow" },
    { value: "7", label: "7 - Estornado", color: "blue" },
  ]

  // Ícone de status da conexão
  const getConnectionIcon = () => {
    if (isConnecting) return <Activity className="h-4 w-4 animate-spin text-blue-500" />
    if (isConnected) return <Wifi className="h-4 w-4 text-green-500" />
    if (error) return <WifiOff className="h-4 w-4 text-red-500" />
    return <WifiOff className="h-4 w-4 text-gray-400" />
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

        {/* Status da Conexão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getConnectionIcon()}
              Status da Conexão Realtime
            </CardTitle>
            <CardDescription>Monitoramento via WebSocket do Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold">{getConnectionBadge()}</div>
                <p className="text-sm text-gray-500">Status</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{connectionAttempts}</div>
                <p className="text-sm text-gray-500">Tentativas</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{lastUpdate ? "Sim" : "Não"}</div>
                <p className="text-sm text-gray-500">Dados Recebidos</p>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{currentStatus?.status_code || "N/A"}</div>
                <p className="text-sm text-gray-500">Status Atual</p>
              </div>
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 mb-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erro:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={reconnect} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reconectar
              </Button>
              {lastUpdate && (
                <Badge variant="outline">Última atualização: {new Date(lastUpdate).toLocaleTimeString("pt-BR")}</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controles */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Configuração */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Teste</CardTitle>
              <CardDescription>Configure o External ID e status para simulação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="external-id">External ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="external-id"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    placeholder="SHEIN_123456789_test"
                  />
                  <Button onClick={generateNewId} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="status-code">Status Code para Simulação</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusCodes.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex gap-2">
                {!isMonitoring ? (
                  <Button onClick={startMonitoring} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Monitoramento
                  </Button>
                ) : (
                  <Button onClick={stopMonitoring} variant="destructive" className="flex-1">
                    <Square className="h-4 w-4 mr-2" />
                    Parar Monitoramento
                  </Button>
                )}

                <Button onClick={simulatePayment} disabled={isSimulating || !isMonitoring} variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  {isSimulating ? "Simulando..." : "Simular"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Status Atual */}
          <Card>
            <CardHeader>
              <CardTitle>Status Atual do Pagamento</CardTitle>
              <CardDescription>Informações em tempo real via Realtime</CardDescription>
            </CardHeader>
            <CardContent>
              {currentStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Status Code:</span>
                    <Badge variant="outline">{currentStatus.status_code}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Título:</span>
                    <span className="font-medium">{currentStatus.status_title}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Valor:</span>
                    <span className="font-bold text-green-600">R$ {currentStatus.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Processado:</span>
                    <span className="text-sm">{new Date(currentStatus.processed_at).toLocaleString("pt-BR")}</span>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {currentStatus.is_paid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-300" />
                      )}
                      Pago
                    </div>
                    <div className="flex items-center gap-2">
                      {currentStatus.is_denied ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-gray-300" />
                      )}
                      Negado
                    </div>
                    <div className="flex items-center gap-2">
                      {currentStatus.is_expired ? (
                        <Clock className="h-4 w-4 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-gray-300" />
                      )}
                      Vencido
                    </div>
                    <div className="flex items-center gap-2">
                      {currentStatus.is_canceled ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-gray-300" />
                      )}
                      Cancelado
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum status encontrado</p>
                  <p className="text-sm">Inicie o monitoramento e simule um pagamento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Logs em Tempo Real */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Logs em Tempo Real
            </CardTitle>
            <CardDescription>Acompanhe o funcionamento do sistema Realtime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <Badge variant="outline">{logs.length} entradas</Badge>
              <Button onClick={clearLogs} variant="outline" size="sm">
                Limpar Logs
              </Button>
            </div>

            <div className="bg-black text-green-400 p-4 rounded-lg h-64 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">Aguardando logs...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Como Usar</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Configure um External ID único (ou gere um novo)</li>
              <li>Clique em "Iniciar Monitoramento" para conectar ao Realtime</li>
              <li>Aguarde a conexão ser estabelecida (status "Conectado")</li>
              <li>Selecione um status code e clique em "Simular" para testar</li>
              <li>Observe os logs em tempo real e as mudanças de status</li>
              <li>O sistema deve reagir instantaneamente aos webhooks</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
