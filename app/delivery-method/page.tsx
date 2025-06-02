import Link from "next/link"
import { Truck, Building, MapPin } from "lucide-react"

export default function DeliveryMethodPage() {
  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">Método de Entrega</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-8">Escolha como você deseja receber seu novo cartão</p>

          {/* Delivery Options */}
          <div className="space-y-4 mb-8">
            {/* Mail Delivery Option */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <Truck className="w-12 h-12 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Entrega pelos Correios</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Receba seu cartão no conforto da sua casa em até 1 dia útil
                </p>
                <Link
                  href="/delivery-address"
                  className="w-full bg-black text-white rounded-lg py-3 px-4 text-center font-medium hover:bg-black/90 transition-colors"
                >
                  Prefiro receber pelos Correios
                </Link>
              </div>
            </div>

            {/* Agency Pickup Option */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <Building className="w-12 h-12 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Retirada em Agência</h3>
                <p className="text-gray-600 text-sm">Retire seu cartão em uma de nossas agências</p>
              </div>
            </div>

            {/* Mensagem de indisponibilidade */}
            <div className="text-center text-red-500 text-sm font-medium px-4">
              A opção de retirada na agência está temporariamente indisponível devido à alta demanda. Agradecemos sua
              compreensão.
            </div>
          </div>

          {/* Agency Information */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-3">Nossas Agências</h3>

            <div className="mb-4">
              <p className="font-medium text-gray-800 mb-3">Agência Central</p>

              <div className="text-sm text-gray-600 leading-relaxed">
                <p>Avenida Paulista, 1230</p>
                <p>Conj 612 a 1510 Lado Par</p>
                <p>Bela Vista, São Paulo - SP</p>
                <p>01310-100</p>
              </div>
            </div>

            <div className="flex justify-center">
              <MapPin className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
