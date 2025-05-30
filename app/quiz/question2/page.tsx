import Image from "next/image"

export default function QuizQuestion2Page() {
  return (
    <main className="min-h-full bg-gray-50">
      {/* Quiz Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          {/* Imagem dos cartões SHEIN */}
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-48 sm:w-80 sm:h-60">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/shein_card_resized-Hib5lQgpq3CI6fhaUDcK6uOjEAAL71.png"
                alt="Cartões de crédito SHEIN"
                fill
                style={{ objectFit: "contain" }}
                priority
                className="rounded-lg"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-8">Em qual grupo você se encaixa?</h1>

          <div className="flex flex-col gap-3">
            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Empreendedor
            </a>

            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Carteira assinada
            </a>

            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Desempregado
            </a>

            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Aposentado
            </a>

            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Servidor público
            </a>

            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Estudante
            </a>

            <a
              href="/quiz/question3"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Autônomo
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
