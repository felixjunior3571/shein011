"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Clock, Lock, ChevronDown, ChevronUp } from "lucide-react"

export default function FinalConfirmationPage() {
  const [minutes, setMinutes] = useState(4)
  const [seconds, setSeconds] = useState(17)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  // Contador regressivo
  useEffect(() => {
    const timer = setInterval(() => {
      if (seconds > 0) {
        setSeconds(seconds - 1)
      } else if (minutes > 0) {
        setMinutes(minutes - 1)
        setSeconds(59)
      } else {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [minutes, seconds])

  // Formata o tempo para exibição
  const formatTime = () => {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds
    return `${formattedMinutes}:${formattedSeconds}`
  }

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  const faqs = [
    {
      question: "Como funciona o cartão virtual?",
      answer:
        "Você receberá seus cartões um virtual para uso imediato em compras online com total segurança, e um físico que será entregue em sua casa. O cartão virtual é ativado assim que confirmamos o pagamento do frete, e o físico chega pelos Correios.",
    },
    {
      question: "Por que eu preciso pagar o frete?",
      answer:
        "O pagamento do frete é obrigatório para garantir a entrega segura do seu cartão físico e a ativação imediata do seu cartão virtual. Sem ele, não é possível concluir o envio.",
    },
    {
      question: "O que acontece depois que eu pagar o frete?",
      answer:
        "• Seu cartão virtual é ativado e enviado por WhatsApp - Você recebe acesso ao aplicativo com seu cartão\n• Um gerente exclusivo entra em contato via WhatsApp\n• Enviamos o código de rastreamento do cartão físico",
    },
    {
      question: "E se eu pagar o frete e o cartão não chegar?",
      answer:
        "O cartão é enviado pelos Correios com rastreamento e garantimos 100% a entrega. Caso ocorra algum problema, enviaremos outro cartão sem custo para você. Nunca tivemos problemas com nossas usuárias.",
    },
    {
      question: "E se eu não pagar o frete agora?",
      answer:
        "Além de não receber o cartão, você perderá o limite já aprovado e não poderá fazer nova solicitação. Essa é uma oportunidade única, então não deixe para depois!",
    },
    {
      question: "Já paguei o frete. Preciso fazer mais alguma coisa?",
      answer:
        "Não. Após o pagamento, cuidamos de tudo. O envio do cartão é iniciado em até 2 horas, e você receberá o link com o código de rastreamento para acompanhar a entrega. É só aguardar!",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white py-4 flex justify-center border-b">
        <div className="relative w-[120px] h-[40px]">
          <Image src="/shein-logo.png" alt="SHEIN" fill style={{ objectFit: "contain" }} priority />
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-8">
        <div className="max-w-md mx-auto space-y-4">
          {/* Main Card */}
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* Limite Disponível */}
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-600">Limite Disponível</p>
              <p className="text-2xl font-bold text-black">R$ 11.700,00</p>
            </div>

            {/* Cartão Virtual */}
            <div className="bg-black text-white rounded-lg p-4 mb-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs">Cartão Virtual</p>
                <div className="h-4 w-8 relative flex-shrink-0">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-PxJG3d4b4NVb0wSl1Px3lndoiV1rxJ.png"
                    alt="Logo do cartão"
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
              </div>

              <p className="text-base mb-4 font-mono">4532 •••• •••• ••••</p>

              <div className="flex justify-between items-end text-xs">
                <div className="flex-1">
                  <p className="text-gray-400 mb-1">TITULAR</p>
                  <p className="text-xs truncate">Santos Silva</p>
                </div>
                <div className="text-center flex-shrink-0 mx-2">
                  <p className="text-gray-400 mb-1">VALIDADE</p>
                  <p className="text-xs">12/31</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-gray-400 mb-1">CVV</p>
                  <p className="text-xs">•••</p>
                </div>
              </div>
            </div>

            {/* Instruções */}
            <div className="text-center mb-4">
              <p className="font-medium mb-1 text-sm">Finalize o envio do seu cartão</p>
              <p className="text-xs text-gray-600">Pague o frete para receber o cartão físico e ativar o virtual.</p>
            </div>

            {/* Detalhes do Envio */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-medium text-gray-800">Método de Envio</p>
                  <p className="text-gray-600">CORREIOS - SEDEX</p>
                </div>

                <div>
                  <p className="font-medium text-gray-800">Prazo de Entrega</p>
                  <p className="text-black font-medium">1 dia útil</p>
                </div>

                <div>
                  <p className="font-medium text-gray-800">Pagamento em Até 10 Minutos</p>
                  <p className="text-gray-600">
                    Realize o pagamento do frete em até 10 minutos para ativar o cartão virtual.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-gray-800">Ativação Após Pagamento</p>
                  <p className="text-gray-600">
                    O cartão virtual será ativado automaticamente após a aprovação do pagamento.
                  </p>
                </div>
              </div>
            </div>

            {/* Valor do Frete */}
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-black">R$ 34,90</p>
              <p className="text-xs text-gray-600">O pagamento será confirmado imediatamente</p>
            </div>

            {/* Botão de Pagamento */}
            <button className="w-full bg-black text-white font-bold py-3 px-4 rounded-md hover:bg-black/90 transition-colors mb-2 text-sm">
              Pagar Frete
            </button>

            {/* Pagamento Seguro */}
            <div className="flex justify-center items-center text-green-600 text-xs mb-3">
              <Lock className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>Pagamento 100% seguro</span>
            </div>

            {/* Alerta de Unidades Limitadas */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center text-red-600">
              <p className="font-medium text-xs">Apenas 5 unidades disponíveis!</p>
              <div className="flex justify-center items-center my-1">
                <Clock className="w-3 h-3 mr-1 text-red-600 flex-shrink-0" />
                <span className="font-bold text-sm">{formatTime()}</span>
              </div>
              <p className="text-xs">Ative agora ou perca seu limite aprovado!</p>
            </div>
          </div>

          {/* Perguntas Frequentes */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-base font-bold text-center mb-4">Perguntas Frequentes</h2>

            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-3 text-left flex justify-between items-start hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-xs pr-2 leading-tight">{faq.question}</span>
                    <div className="flex-shrink-0 ml-2">
                      {expandedFaq === index ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  {expandedFaq === index && (
                    <div className="px-3 pb-3">
                      <div className="text-xs text-gray-600 leading-relaxed">
                        {faq.answer.split("\n").map((line, lineIndex) => (
                          <p key={lineIndex} className={lineIndex > 0 ? "mt-2" : ""}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
