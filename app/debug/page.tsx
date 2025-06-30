"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DebugData {
  faturas: any[]
  superpayConnection: boolean
  supabaseConnection: boolean
}

export default function DebugPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null)
  const [loading, setLoading] = useState(false)

  const loadDebugData = async () => {
    setLoading(true)
    try {
      // Simular dados de debug
      const mockData: DebugData = {
        faturas: [
          {
            id: "1",
            external_id: "FRETE_1234567890_abc123",
            token: "token123...",
            status: "pendente",
            amount: 27.97,
            created_at: new Date().toISOString(),
          },
        ],
        superpayConnection: true,
        supabaseConnection: true,
      }

      setDebugData(mockData)
    } catch (error) {
      console.error("Erro ao carregar debug:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDebugData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pago":
        return "bg-green-500"
      case "pendente":
        return "bg-yellow-500"
      case "cancelado":
      case "recusado":
      case "vencido":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Debug - SuperPay Integration</h1>
          <p className="text-gray-600 mt-2">Monitoramento do sistema</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Conexões */}
          <Card>
            <CardHeader>
              <CardTitle>Status das Conexões</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span>SuperPay API</span>
                <Badge className={debugData?.superpayConnection ? "bg-green-500" : "bg-red-500"}>
                  {debugData?.superpayConnection ? "Conectado" : "Erro"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Supabase</span>
                <Badge className={debugData?.supabaseConnection ? "bg-green-500" : "bg-red-500"}>
                  {debugData?.supabaseConnection ? "Conectado" : "Erro"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Faturas Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Faturas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Carregando...</p>
              ) : (
                <div className="space-y-3">
                  {debugData?.faturas.map((fatura) => (
                    <div key={fatura.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-mono">{fatura.external_id}</span>
                        <Badge className={getStatusColor(fatura.status)}>{fatura.status}</Badge>
                      </div>
                      <div className="text-xs text-gray-500">
                        R$ {fatura.amount} - {new Date(fatura.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <Button onClick={loadDebugData} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar Debug"}
          </Button>
        </div>
      </div>
    </div>
  )
}
