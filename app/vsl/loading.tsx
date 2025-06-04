export default function VSLLoading() {
  return (
    <main className="min-h-full bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse">
            {/* Título skeleton */}
            <div className="text-center mb-6">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-16 bg-gray-200 rounded mb-4"></div>
              <div className="h-12 bg-gray-200 rounded mb-6"></div>
            </div>

            {/* Vídeo skeleton */}
            <div className="aspect-video bg-gray-200 rounded-lg mb-6"></div>

            {/* Indicadores skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
              <div className="h-20 bg-gray-200 rounded-lg"></div>
            </div>

            {/* Botão skeleton */}
            <div className="text-center">
              <div className="h-14 bg-gray-200 rounded-lg w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
