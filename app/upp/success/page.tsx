"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { CheckCircle, CreditCard, Smartphone, Download, ExternalLink } from "lucide-react"

export default function ActivationSuccessPage() {
  const [userName, setUserName] = useState("")
  const [activationDate, setActivationDate] = useState("")

  useEffect(() => {
    // Carregar dados do usuário
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    const actDate = localStorage.getItem("activationDate") || new Date().toISOString()

    setUserName(cpfData.nome || "Cliente")
    setActivationDate(new Date(actDate).toLocaleDateString("pt-BR"))
  }, [])

  const handleDownloadApp = () => {
    // Simular download do app
    window.open("https://play.google.com/store/apps/details?id=com.sheincard", "_blank")
  }

  const handleAccessWebApp = () => {
    // Simular acesso ao app web
    window.open("https://app.sheincard.com", "_blank")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 text-center space-y-6">
          {/* Header de Sucesso */}
          <div className="space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <Image src="/shein-card-logo-new.png" alt="SHEIN Card" width={100} height={60} className="mx-auto" />
          </div>

          {/* Título Principal */}
          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-green-600">🎉 Parabéns!</h1>
            <h2 className="text-xl font-bold text-gray-800">
              Sua conta foi ativada com sucesso, {userName.split(" ")[0]}!
            </h2>
            <p className="text-gray-600">
              Seu cartão virtual já está disponível e você pode começar a usar todos os benefícios da conta digital
              SHEIN.
            </p>
          </div>

          {/* Informações da Ativação */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-green-800">✅ Conta Ativada</h3>
            <div className="text-sm text-green-700 space-y-1">
              <div className="flex justify-between">
                <span>Data de ativação:</span>
                <span className="font-semibold">{activationDate}</span>
              </div>
              <div className="flex justify-between">
                <span>Depósito realizado:</span>
                <span className="font-semibold">R$ 25,00</span>
              </div>
              <div className="flex justify-between">
                <span>Status da conta:</span>
                <span className="font-semibold text-green-600">🟢 Ativa</span>
              </div>
            </div>
          </div>

          {/* Benefícios Disponíveis */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">🎁 Agora você tem acesso a:</h3>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <CreditCard className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="font-semibold text-gray-800">Cartão Virtual</p>
                  <p className="text-sm text-gray-600">Use imediatamente para compras online</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Smartphone className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="font-semibold text-gray-800">PIX 24h</p>
                  <p className="text-sm text-gray-600">Transferências sem taxas a qualquer hora</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="font-semibold text-gray-800">Cashback</p>
                  <p className="text-sm text-gray-600">Ganhe dinheiro de volta em todas as compras</p>
                </div>
              </div>
            </div>
          </div>

          {/* Próximos Passos */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-800">📱 Próximos Passos:</h3>

            <div className="space-y-3">
              <button
                onClick={handleDownloadApp}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Baixar App SHEIN Card</span>
                </div>
              </button>

              <button
                onClick={handleAccessWebApp}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-2">
                  <ExternalLink className="w-5 h-5" />
                  <span>Acessar Versão Web</span>
                </div>
              </button>
            </div>
          </div>

          {/* Informações do Cartão Físico */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-gray-800">📦 Seu Cartão Físico</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-blue-600 font-semibold">🏭 Em produção</span>
              </div>
              <div className="flex justify-between">
                <span>Previsão de entrega:</span>
                <span className="font-semibold">5-7 dias úteis</span>
              </div>
              <div className="flex justify-between">
                <span>Acompanhamento:</span>
                <span className="text-blue-600 font-semibold">Via app</span>
              </div>
            </div>
          </div>

          {/* Suporte */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">Precisa de ajuda? Entre em contato conosco</p>
            <p className="text-xs text-gray-500">📞 (11) 99999-9999 | 📧 suporte@sheincard.com</p>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">SHEIN Card - Sua liberdade financeira começa aqui</p>
          </div>
        </div>
      </div>
    </main>
  )
}
