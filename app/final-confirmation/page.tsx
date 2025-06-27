"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CheckCircle, CreditCard, Truck, Calendar } from "lucide-react"

export default function FinalConfirmationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleConfirm = async () => {
    setIsLoading(true)

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Redirecionar para checkout interno
    router.push("/checkout")
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Image
                src="/shein-card-logo-new.png"
                alt="SHEIN Card"
                width={120}
                height={80}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold mb-2">Confirmação Final</h1>
            <p className="text-gray-600">Revise seus dados antes de finalizar</p>
          </div>

          {/* Resumo do Pedido */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Cartão SHEIN
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Limite aprovado:</span>
                  <span className="font-bold">R$ 1.500,00</span>
                </div>
                <div className="flex justify-between">
                  <span>Anuidade:</span>
                  <span className="font-bold text-green-600">GRÁTIS</span>
                </div>
                <div className="flex justify-between">
                  <span>Cartão virtual:</span>
                  <span>Imediato</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Entrega
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Método:</span>
                  <span>SEDEX</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxa:</span>
                  <span className="font-bold">R$ 34,90</span>
                </div>
                <div className="flex justify-between">
                  <span>Prazo:</span>
                  <span>5-7 dias úteis</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Vencimento
              </h3>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span>Melhor dia:</span>
                  <span className="font-bold">Todo dia 15</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total a pagar:</span>
              <span className="text-2xl text-green-600">R$ 34,90</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Taxa de entrega do cartão físico</p>
          </div>

          {/* Botão de Confirmação */}
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full bg-black hover:bg-black/90 text-white font-bold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processando...
              </div>
            ) : (
              "FINALIZAR PEDIDO"
            )}
          </button>

          {/* Informações de Segurança */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center text-green-600 mb-2">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Transação 100% Segura</span>
            </div>
            <p className="text-xs text-gray-500">Seus dados estão protegidos com criptografia SSL</p>
          </div>
        </div>
      </div>
    </main>
  )
}
