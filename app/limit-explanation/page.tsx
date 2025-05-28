import Link from "next/link"

export default function LimitExplanationPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* Header removed as it's now in the global layout */}

      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-4">Entenda como funciona seu limite</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-8">Saiba como seu limite de crédito pode aumentar ou diminuir</p>

          {/* Limit Increase Box */}
          <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-green-800 mb-2">Aumento de Limite</h3>
            <p className="text-sm text-green-700">
              Caso você realize o pagamento das faturas em dia, seu limite será aumentado constantemente.
            </p>
          </div>

          {/* Limit Reduction Box */}
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4 mb-8">
            <h3 className="font-bold text-yellow-800 mb-2">Redução de Limite</h3>
            <p className="text-sm text-yellow-700">
              No entanto, se houver atraso no pagamento das faturas, o limite poderá ser reduzido.
            </p>
          </div>

          {/* Agree Button */}
          <Link
            href="/choose-due-date"
            className="block w-full bg-black text-white text-center py-3 rounded-md font-medium hover:bg-black/90 transition-colors"
          >
            Concordo
          </Link>
        </div>
      </div>
    </main>
  )
}
