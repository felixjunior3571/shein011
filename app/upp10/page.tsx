"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UppThanksPage() {
  const [userName, setUserName] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Carregar dados do usuário
    const cpfData = JSON.parse(localStorage.getItem("cpfConsultaData") || "{}")
    setUserName(cpfData.nome?.split(" ")[0] || "")

    // Definir favicon dinâmico
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement
    if (favicon) {
      favicon.href = "/images/pix-favicon.png"
    }
  }, [])

  const handlePayment = () => {
    // Lógica de pagamento aqui
    console.log("Processando pagamento IOF...")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-6 pb-4">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">
            Parabéns, finalize a última etapa para concluir a sua solicitação
          </h1>
          <div className="w-16 h-0.5 bg-gray-900 mb-4"></div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Você está a um passo de concluir o pedido do seu cartão de crédito. Ao solicitar a emissão do seu cartão de
            crédito ou a aprovação de um empréstimo, você estará sujeito à cobrança do Imposto sobre Operações
            Financeiras (IOF), que é regulamentado e emitido pelo Banco Central. Este imposto é aplicado para financiar
            operações financeiras e garantir a conformidade com as normas fiscais.
          </p>
        </div>

        {/* IOF Section */}
        <div className="mx-6 mb-6 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">O que é o IOF?</h3>

          {/* Volume Icons */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Aumente o volume</span>
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-red-500">
                  📢
                </div>
              ))}
            </div>
          </div>

          {/* Video Player */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-6">
            <div className="aspect-video flex items-center justify-center relative">
              {/* Phone illustration */}
              <div className="relative">
                <div className="w-20 h-32 bg-yellow-400 rounded-lg border-4 border-gray-800 flex items-center justify-center">
                  <div className="text-teal-500 text-2xl">💳</div>
                </div>
                {/* Sparkle effects */}
                <div className="absolute -top-2 -left-2 text-gray-300">✨</div>
                <div className="absolute -top-1 -right-3 text-gray-300">✨</div>
                <div className="absolute -bottom-2 -left-3 text-gray-300">✨</div>
                <div className="absolute -bottom-1 -right-2 text-gray-300">✨</div>
                <div className="absolute top-1/2 -right-6 text-gray-300">✨</div>
              </div>

              {/* Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="flex items-center gap-3 text-white">
                  <button className="hover:text-gray-300">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <span className="text-sm">0:00 / 0:44</span>
                  <div className="flex-1 bg-gray-600 h-1 rounded">
                    <div className="bg-white h-1 rounded w-0"></div>
                  </div>
                  <button className="hover:text-gray-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  </button>
                  <button className="hover:text-gray-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                    </svg>
                  </button>
                  <button className="hover:text-gray-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            {/* Pagamento Frete - Completed */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7v2H4V4h3.5l1-1h7l1 1H20z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-600">Pagamento Frete</p>
                <p className="text-sm text-green-500">Pagamento concluído com sucesso</p>
              </div>
            </div>

            {/* Depósito de Ativação - Completed */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-600">Depósito de Ativação</p>
                <p className="text-sm text-green-500">Pagamento concluído com sucesso</p>
              </div>
            </div>

            {/* Pagamento do Imposto IOF - Current */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="w-8 h-8 bg-teal-100 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="m15.45 16.52l-3.01-3.01c-.11-.11-.24-.13-.31-.13s-.2.02-.31.13L8.8 16.53c-.34.34-.87.89-2.64.89l3.71 3.7a3 3 0 0 0 4.24 0l3.72-3.71c-.91 0-1.67-.18-2.38-.89M8.8 7.47l3.02 3.02c.08.08.2.13.31.13s.23-.05.31-.13l2.99-2.99c.71-.74 1.52-.91 2.43-.91l-3.72-3.71a3 3 0 0 0-4.24 0l-3.71 3.7c1.76 0 2.3.58 2.61.89" />
                  <path d="m21.11 9.85l-2.25-2.26H17.6c-.54 0-1.08.22-1.45.61l-3 3c-.28.28-.65.42-1.02.42a1.5 1.5 0 0 1-1.02-.42L8.09 8.17c-.38-.38-.9-.6-1.45-.6H5.17l-2.29 2.3a3 3 0 0 0 0 4.24l2.29 2.3h1.48c.54 0 1.06-.22 1.45-.6l3.02-3.02c.28-.28.65-.42 1.02-.42s.74.14 1.02.42l3.01 3.01c.38.38.9.6 1.45.6h1.26l2.25-2.26a3.04 3.04 0 0 0-.02-4.29" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-red-600">Pagamento do Imposto IOF</p>
                <p className="text-sm text-red-500">Aguardando pagamento para liberação do cartão de crédito</p>
              </div>
            </div>

            {/* Cartão Virtual Liberado - Pending */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-500">Cartão Virtual Liberado</p>
                <p className="text-sm text-gray-400">Cartão físico em preparação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="px-6 mb-6">
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            O não pagamento do imposto resulta no cancelamento do pedido do cartão de crédito, impossibilitando uma nova
            contratação por um prazo <strong>máximo de 90 dias</strong>
          </p>
        </div>

        {/* Payment Section */}
        <div className="mx-6 mb-6 border border-gray-200 rounded-lg p-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Pague via Pix</h3>
              <svg className="w-6 h-6 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="m15.45 16.52l-3.01-3.01c-.11-.11-.24-.13-.31-.13s-.2.02-.31.13L8.8 16.53c-.34.34-.87.89-2.64.89l3.71 3.7a3 3 0 0 0 4.24 0l3.72-3.71c-.91 0-1.67-.18-2.38-.89M8.8 7.47l3.02 3.02c.08.08.2.13.31.13s.23-.05.31-.13l2.99-2.99c.71-.74 1.52-.91 2.43-.91l-3.72-3.71a3 3 0 0 0-4.24 0l-3.71 3.7c1.76 0 2.3.58 2.61.89" />
                <path d="m21.11 9.85l-2.25-2.26H17.6c-.54 0-1.08.22-1.45.61l-3 3c-.28.28-.65.42-1.02.42a1.5 1.5 0 0 1-1.02-.42L8.09 8.17c-.38-.38-.9-.6-1.45-.6H5.17l-2.29 2.3a3 3 0 0 0 0 4.24l2.29 2.3h1.48c.54 0 1.06-.22 1.45-.6l3.02-3.02c.28-.28.65-.42 1.02-.42s.74.14 1.02.42l3.01 3.01c.38.38.9.6 1.45.6h1.26l2.25-2.26a3.04 3.04 0 0 0-.02-4.29" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-4">O pagamento será confirmado imediatamente</p>

            <div className="text-3xl font-semibold text-teal-500 mb-6">R$ 21,88</div>

            <button
              onClick={handlePayment}
              className="w-full py-3 px-6 bg-yellow-400 text-gray-900 font-semibold rounded-full hover:bg-yellow-500 transition-colors mb-4"
            >
              Pagar agora
            </button>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z" />
              </svg>
              Ambiente seguro
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
