import Image from "next/image"

export default function QuizQuestion4Page() {
  return (
    <main className="min-h-full bg-gray-50">
      {/* Quiz Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          {/* Imagem das roupas SHEIN */}
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-48 sm:w-80 sm:h-60">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Shein_GettyImages-1493542894.png-3Zs6q8sThx7Bkm6HaWWwYLoqzuUW1Y.jpeg"
                alt="Roupas SHEIN em loja"
                fill
                style={{ objectFit: "cover" }}
                priority
                className="rounded-lg"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-8">Você está negativado?</h1>

          <div className="flex flex-col gap-3">
            <a
              href="/quiz/success"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Sim!
            </a>

            <a
              href="/quiz/success"
              className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors"
            >
              Não!
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
