export default function ShippingMethodLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="animate-pulse mb-6">
          <div className="w-16 h-16 bg-blue-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Calculando Frete...</h2>
        <p className="text-gray-600">Encontrando as melhores opções de entrega para você.</p>
        <div className="mt-6 space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}
