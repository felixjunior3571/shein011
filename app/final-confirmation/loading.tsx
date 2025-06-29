export default function FinalConfirmationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="animate-pulse mb-6">
          <div className="w-20 h-20 bg-green-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Finalizando Pedido...</h2>
        <p className="text-gray-600 mb-6">Estamos processando todas as informações do seu cartão SHEIN.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/5"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
