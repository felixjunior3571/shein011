import Image from "next/image"

export default function QuizQuestion3Page() {
  return (
    <main className="min-h-full bg-gray-50">
      {/* Quiz Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          {/* Imagem da loja SHEIN */}
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-48 sm:w-80 sm:h-60">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/loja-da-shein-em-toquio-novembro-de-2022-imagem-dick-thomas-johnsonflickrreproducao-1688579301012_v2_900x506.jpg-7uJs8eEDcMxoGCSl8Jfft2LM6pHhFh.jpeg"
                alt="Loja física SHEIN"
                fill
                style={{ objectFit: "contain" }}
                priority
                className="rounded-lg"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-8">Qual é a sua Renda Mensal?</h1>

          <div className="flex flex-col gap-3">
            <a
              href="/quiz/question4"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Até R$ 1.000
            </a>

            <a
              href="/quiz/question4"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Entre R$ 1.000 e R$ 2.000
            </a>

            <a
              href="/quiz/question4"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Entre R$ 2.000 e R$ 4.000
            </a>

            <a
              href="/quiz/question4"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Acima de R$ 4.000
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
