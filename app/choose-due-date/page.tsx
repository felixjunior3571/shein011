import Link from "next/link"

export default function ChooseDueDatePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      {/* Header removed as it's now in the global layout */}

      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-4">Escolha a melhor data</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-8">Selecione o melhor dia para o vencimento da sua fatura</p>

          {/* Due Date Options */}
          <div className="flex flex-col gap-3">
            <Link
              href="/choose-card-design"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Dia 5
            </Link>

            <Link
              href="/choose-card-design"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Dia 10
            </Link>

            <Link
              href="/choose-card-design"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Dia 15
            </Link>

            <Link
              href="/choose-card-design"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Dia 25
            </Link>

            <Link
              href="/choose-card-design"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Dia 30
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
