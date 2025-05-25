export default function QuizSuccessPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white py-4 flex justify-center border-b">
        <div className="text-3xl font-bold tracking-widest">SHEIN</div>
      </header>

      {/* Success Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-green-500 mb-4">Temos um cartão perfeito para você!</h1>

          <p className="text-lg mb-8">Conclua seu cadastro e faça seu cartão de crédito agora!</p>

          <a
            href="/quiz/terms"
            className="bg-black text-white rounded-lg p-4 text-center font-medium hover:bg-black/90 transition-colors block"
          >
            Continuar
          </a>
        </div>
      </div>
    </main>
  )
}
