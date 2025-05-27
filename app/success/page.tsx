import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SuccessPage() {
  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle size={64} className="text-green-500" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Parabéns!</h1>
          <p className="text-lg mb-6">Seu cartão foi aprovado!</p>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <p className="font-medium">Detalhes do seu cartão:</p>
            <div className="mt-2">
              <p className="text-sm">
                Limite aprovado: <span className="font-bold">R$ 1.500,00</span>
              </p>
              <p className="text-sm">
                Cartão virtual: <span className="font-bold">Disponível agora</span>
              </p>
              <p className="text-sm">
                Cartão físico: <span className="font-bold">Em até 7 dias úteis</span>
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-block bg-black hover:bg-black/80 text-white font-bold py-3 px-6 rounded-md transition"
          >
            ACESSAR MINHA CONTA
          </Link>
        </div>
      </div>
    </main>
  )
}
