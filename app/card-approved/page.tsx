import { CheckCircle, CreditCard, Percent, Plane, ShoppingBag, Wallet } from "lucide-react"
import Link from "next/link"

export default function CardApprovedPage() {
  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-center mb-4">Seu cartão foi aprovado com sucesso!</h1>

          <p className="text-center text-gray-600 mb-6">
            Parabéns! Você agora tem acesso a todos os benefícios exclusivos do seu novo cartão.
          </p>

          {/* Analysis Message */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-700 text-center">
              Analisamos suas informações e notamos que este é o primeiro cartão que você solicita conosco. Sendo assim,
              não conseguimos liberar limites acima de R$ 15.000,00.
            </p>
          </div>

          {/* Card Details */}
          <div className="bg-black text-white rounded-lg p-6 mb-6 text-center">
            <h2 className="text-lg font-medium mb-2">Seu novo cartão</h2>
            <h3 className="text-xl font-bold mb-4">PLATINUM+</h3>

            <div className="mb-2">
              <span className="text-sm">Limite Aprovado</span>
            </div>
            <div className="text-3xl font-bold">R$ 11.700,00</div>
          </div>

          {/* Benefits Section */}
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-4">Conheça o novo cartão PLATINUM+</h3>
            <p className="text-sm text-gray-600 mb-4">Além do crédito liberado, você terá esses benefícios:</p>

            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <CreditCard className="w-5 h-5 mr-3 text-gray-600" />
                <span className="text-sm">Saque até 50% do limite em caixa eletrônico 24h</span>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Percent className="w-5 h-5 mr-3 text-gray-600" />
                <span className="text-sm">Cashback de até 5% em compras online</span>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <ShoppingBag className="w-5 h-5 mr-3 text-gray-600" />
                <span className="text-sm">Descontos de até 15% em farmácias Pacheco</span>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Wallet className="w-5 h-5 mr-3 text-gray-600" />
                <span className="text-sm">Descontos em lojas parceiras</span>
              </div>

              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Plane className="w-5 h-5 mr-3 text-gray-600" />
                <span className="text-sm">Acesso a salas VIP em aeroportos</span>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <Link
            href="/limit-explanation"
            className="block w-full bg-black text-white text-center py-3 rounded-md font-medium hover:bg-black/90 transition-colors"
          >
            Continuar
          </Link>
        </div>
      </div>
    </main>
  )
}
