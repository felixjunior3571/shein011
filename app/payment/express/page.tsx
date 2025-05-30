"use client"

import { useState, useEffect } from "react"
import { Clock, Lock, Truck } from "lucide-react"

export default function ExpressPaymentPage() {
  const [minutes, setMinutes] = useState(9)
  const [seconds, setSeconds] = useState(59)

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

  const formatTime = () => {
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes
    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds
    return `${formattedMinutes}:${formattedSeconds}`
  }

  // Preço fixo para EXPRESS
  const EXPRESS_PRICE = "R$ 29,58"

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Method Selected */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Truck className="w-12 h-12 text-black" />
            </div>
            <h1 className="text-xl font-bold mb-2">EXPRESS Selecionado</h1>
            <p className="text-gray-600">Entrega em 5 dias úteis</p>
          </div>

          {/* Price */}
          <div className="text-center mb-6">
            <p className="text-3xl font-bold text-black">{EXPRESS_PRICE}</p>
            <p className="text-sm text-gray-600">Pagamento único do frete</p>
          </div>

          {/* Timer */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-6">
            <div className="flex justify-center items-center mb-2">
              <Clock className="w-5 h-5 mr-2 text-red-600" />
              <span className="font-bold text-lg text-red-600">{formatTime()}</span>
            </div>
            <p className="text-sm text-red-600">Tempo restante para finalizar o pagamento</p>
          </div>

          {/* Payment Button */}
          <button className="w-full bg-black text-white font-bold py-4 px-4 rounded-md hover:bg-black/90 transition-colors mb-4">
            PAGAR AGORA - {EXPRESS_PRICE}
          </button>

          {/* Security */}
          <div className="flex justify-center items-center text-green-600 text-sm">
            <Lock className="w-4 h-4 mr-2" />
            <span>Pagamento 100% seguro</span>
          </div>
        </div>
      </div>
    </main>
  )
}
