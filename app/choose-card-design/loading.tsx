export default function ChooseCardDesignLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="animate-pulse">
          <div className="w-64 h-40 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl mx-auto mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Carregando Designs...</h2>
        <p className="text-gray-600">Preparando os designs exclusivos do seu cartão SHEIN.</p>
        <div className="mt-6 flex justify-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
          <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
        </div>
      </div>
    </div>
  )
}
