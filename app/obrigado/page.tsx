"use client"

import { useEffect, useState } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function ObrigadoPage() {
  const [paymentData, setPaymentData] = useState<any>(null)

  useEffect(() => {
    // Recuperar dados do pagamento do localStorage (se disponível)
    const confirmed = localStorage.getItem("paymentConfirmed")
    const amount = localStorage.getItem("paymentAmount")
    const date = localStorage.getItem("paymentDate")

    if (confirmed === "true") {
      setPaymentData({
        amount: amount ? Number.parseFloat(amount) : null,
        date: date ? new Date(date).toLocaleString("pt-BR") : null,
      })
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {/* Ícone de sucesso */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Confirmado!</h1>
            <p className="text-gray-600">Seu pagamento foi processado com sucesso via SuperPayBR</p>
          </div>

          {/* Detalhes do pagamento */}
          {paymentData && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-800 space-y-1">
                {paymentData.amount && <div>Valor: R$ {paymentData.amount.toFixed(2)}</div>}
                {paymentData.date && <div>Data: {paymentData.date}</div>}
                <div>Status: Pago ✅</div>
              </div>
            </div>
          )}

          {/* Próximos passos */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Próximos passos:</h2>
            <div className="text-left space-y-2 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  1
                </span>
                <span>Pagamento confirmado via webhook SuperPayBR</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  2
                </span>
                <span>Dados salvos no Supabase com segurança</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="bg-green-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  3
                </span>
                <span>Processamento automático iniciado</span>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <Link
              href="/checkout"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <span>Fazer Novo Pagamento</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/debug"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Ver Debug do Sistema
            </Link>
          </div>

          {/* Informações técnicas */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Sistema integrado: SuperPayBR v4 + Supabase + Webhook
              <br />
              Zero rate limiting • 100% webhook-based
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
