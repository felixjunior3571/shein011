export default function QuizFinalPage() {
  return (
    <main className="min-h-full bg-gray-50">
      {/* Quiz Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-8">Qual é o seu interesse com um cartão de crédito hoje?</h1>

          <div className="flex flex-col gap-3">
            <a
              href="/loading-analysis"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Fazer uma compra específica
            </a>

            <a
              href="/loading-analysis"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Fazer uma viagem
            </a>

            <a
              href="/loading-analysis"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Poder gastar mais
            </a>

            <a
              href="/loading-analysis"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Organizar a minha vida financeira
            </a>

            <a
              href="/loading-analysis"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Outros
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
