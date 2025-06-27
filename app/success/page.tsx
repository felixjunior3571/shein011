"use client"

import { useEffect, useState } from "react"
import { CheckCircle, CreditCard, Package, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function SuccessPage() {
  const [paymentData, setPaymentData] = useState({
    amount: "0,00",
    description: "Pagamento processado",
    method: "PIX",
  })

  useEffect(() => {
    // Recupera dados do pagamento
    const amount = localStorage.getItem("paymentAmount") || "0"
    const description = localStorage.getItem("paymentDescription") || "Pagamento processado"

    setPaymentData({
      amount: Number(amount).toFixed(2).replace(".", ","),
      description,
      method: "PIX",
    })

    // Limpa dados temporários
    localStorage.removeItem("currentInvoiceId")
    localStorage.removeItem("qrcode")
    localStorage.removeItem("qrCodeUrl")
  }, [])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {/* Ícone de sucesso */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-green-600 mb-4">Pagamento Aprovado!</h1>

          {/* Detalhes */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Valor pago:</span>
              <span className="font-bold text-green-600">R$ {paymentData.amount}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Método:</span>
              <span className="font-medium">PIX</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className="text-green-600 font-medium">✅ Confirmado</span>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-3 flex items-center justify-center">
              <Package className="w-5 h-5 mr-2" />
              Próximos passos
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Cartão virtual será ativado em até 2 horas</span>
              </div>
              <div className="flex items-center">
                <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Cartão físico será enviado hoje</span>
              </div>
              <div className="flex items-center">
                <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>Código de rastreamento por WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Botão continuar */}
          <Link
            href="/card-approved"
            className="w-full bg-black text-white py-3 px-4 rounded-md font-medium hover:bg-black/90 transition-colors inline-block"
          >
            Continuar para Minha Conta
          </Link>

          {/* Mensagem adicional */}
          <p className="text-sm text-gray-500 mt-4">Você receberá um email de confirmação em breve</p>
        </div>
      </div>
    </main>
  )
}
