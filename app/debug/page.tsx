"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Database, Webhook, CheckCircle, AlertCircle } from "lucide-react"

export default function DebugPage() {
  const [supabaseStatus, setSupabaseStatus] = useState<"checking" | "connected" | "error">("checking")
  const [superPayStatus, setSuperPayStatus] = useState<"checking" | "connected" | "error">("checking")
  const [recentFaturas, setRecentFaturas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const checkConnections = async () => {
    setLoading(true)

    // Verificar Supabase
    try {
      const response = await fetch("/api/debug/supabase")
      if (response.ok) {
        setSupabaseStatus("connected")
      } else {
        setSupabaseStatus("error")
      }
    } catch {
      setSupabaseStatus("error")
    }

    // Verificar SuperPay
    try {
      const response = await fetch("/api/debug/superpay")
      if (response.ok) {
        setSuperPayStatus("connected")
      } else {
        setSuperPayStatus("error")
      }
    } catch {
      setSuperPayStatus("error")
    }

    setLoading(false)
  }

  const loadRecentFaturas = async () => {
    try {
      const response = await fetch("/api/debug/faturas")
      if (response.ok) {
        const data = await response.json()
        setRecentFaturas(data.faturas || [])
      }
    } catch (error) {
      console.error("Erro ao carregar faturas:", error)
    }
  }

  useEffect(() => {
    checkConnections()
    loadRecentFaturas()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Conectado"
      case "error":
        return "Erro"
      default:
        return "Verificando..."
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Debug do Sistema</h1>
          <p className="text-gray-600">SuperPayBR v4 + Supabase + Webhook</p>
        </div>

        {/* Status das conexões */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Supabase</h2>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(supabaseStatus)}
              <span className="font-medium">{getStatusText(supabaseStatus)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Banco de dados PostgreSQL para armazenar faturas</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Webhook className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold">SuperPayBR</h2>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(superPayStatus)}
              <span className="font-medium">{getStatusText(superPayStatus)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">API v4 para criação de faturas PIX</p>
          </div>
        </div>

        {/* Botão de refresh */}
        <div className="text-center mb-8">
          <button
            onClick={() => {
              checkConnections()
              loadRecentFaturas()
            }}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar Status</span>
          </button>
        </div>

        {/* Faturas recentes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Faturas Recentes</h2>

          {recentFaturas.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              Nenhuma fatura encontrada. Faça um checkout para testar o sistema.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">External ID</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Valor</th>
                    <th className="text-left py-2">Cliente</th>
                    <th className="text-left py-2">Criado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFaturas.map((fatura) => (
                    <tr key={fatura.id} className="border-b">
                      <td className="py-2 font-mono text-xs">{fatura.external_id}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            fatura.status === "pago"
                              ? "bg-green-100 text-green-800"
                              : fatura.status === "pendente"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {fatura.status}
                        </span>
                      </td>
                      <td className="py-2">R$ {fatura.amount.toFixed(2)}</td>
                      <td className="py-2">{fatura.customer_name}</td>
                      <td className="py-2">{new Date(fatura.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informações do sistema */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Informações do Sistema</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Arquitetura:</strong>
              <ul className="mt-1 space-y-1 text-gray-600">
                <li>• Next.js 14 App Router</li>
                <li>• Supabase PostgreSQL</li>
                <li>• SuperPayBR v4 API</li>
                <li>• Webhook-based updates</li>
              </ul>
            </div>
            <div>
              <strong>Características:</strong>
              <ul className="mt-1 space-y-1 text-gray-600">
                <li>• Zero rate limiting</li>
                <li>• Tokens seguros (15min)</li>
                <li>• Status em tempo real</li>
                <li>• Polling inteligente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
