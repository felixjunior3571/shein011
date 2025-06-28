"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { CheckCircle, CreditCard, Clock, Smartphone, Headphones, Banknote } from "lucide-react"

export default function AccountActivationPage() {
  const [userName, setUserName] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")

  useEffect(() => {
    // Carregar dados do usuário
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    const amount = localStorage.getItem("paymentAmount") || "34.90"

    setUserName(cpfData.nome || "Cliente")
    setPaymentAmount(amount)
  }, [])

  const handleActivateAccount = () => {
    // Simular redirecionamento para app de ativação
    window.open("https://app.exemplo.com/ativar", "_blank")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          {/* Header com Logo */}
          <div className="text-center">
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={80} height={48} className="mx-auto mb-4" />
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <span className="text-green-600 font-semibold">Pagamento Confirmado</span>
            </div>
          </div>

          {/* Título Principal */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold text-green-600 leading-tight">Parabéns, {userName.split(" ")[0]}! 🎉</h1>
            <h2 className="text-xl font-bold text-gray-800 leading-tight">
              O seu cartão está em produção! Hora de ativar sua conta
            </h2>
          </div>

          {/* Explicação do Depósito */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-gray-700 text-center leading-relaxed">
              Para ativar sua conta e usar seu cartão virtual, é necessário um depósito mínimo de{" "}
              <span className="font-bold text-green-600">R$25,00</span>.
            </p>
            <p className="text-orange-600 text-sm text-center leading-relaxed">
              Este valor não é para nós, ele ficará na sua conta e você poderá usá-lo como quiser assim que tiver acesso
              ao aplicativo.
            </p>
          </div>

          {/* Conta Digital - Benefícios */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-center text-orange-600">Conta Digital:</h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-800" />
                </div>
                <span className="text-gray-700 font-medium">PIX 24 horas</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-yellow-800" />
                </div>
                <span className="text-gray-700 font-medium">Pagamento de boletos</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-yellow-800" />
                </div>
                <span className="text-gray-700 font-medium">Cartão Virtual</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-yellow-800" />
                </div>
                <span className="text-gray-700 font-medium">Saques em caixas eletrônicos</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-yellow-800" />
                </div>
                <span className="text-gray-700 font-medium">Atendimento ao cliente 24/7</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <p className="text-gray-700 font-medium">Ative sua conta depositando nela:</p>

            {/* Ilustração */}
            <div className="flex justify-center items-center py-4">
              <div className="relative">
                <Image
                  src="/hand-phone-illustration.png"
                  alt="Ativação da conta"
                  width={120}
                  height={120}
                  className="mx-auto"
                />
                <div className="absolute -top-2 -left-2 text-2xl">✨</div>
                <div className="absolute -top-1 -right-3 text-xl">⭐</div>
                <div className="absolute -bottom-2 -left-3 text-lg">✨</div>
                <div className="absolute -bottom-1 -right-2 text-2xl">⭐</div>
              </div>
            </div>

            {/* Valor em Destaque */}
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500 mb-2">R$25,00</div>
            </div>
          </div>

          {/* Resumo do Cartão */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-gray-800 text-center">📋 Resumo do seu Cartão SHEIN</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-600 font-semibold">✅ Aprovado</span>
              </div>
              <div className="flex justify-between">
                <span>Frete pago:</span>
                <span className="font-semibold">R$ {paymentAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Produção:</span>
                <span className="text-blue-600 font-semibold">🏭 Em andamento</span>
              </div>
              <div className="flex justify-between">
                <span>Entrega:</span>
                <span className="text-orange-600 font-semibold">📦 5-7 dias úteis</span>
              </div>
            </div>
          </div>

          {/* Botão Principal */}
          <button
            onClick={handleActivateAccount}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            Ativar minha conta agora
          </button>

          {/* Informações Adicionais */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">Ao ativar sua conta, você concorda com nossos termos de uso</p>
            <p className="text-xs text-gray-500">🔒 Seus dados estão protegidos e seguros</p>
          </div>
        </div>
      </div>
    </main>
  )
}
