export default function ManagerLoading() {
  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header Skeleton */}
          <div className="text-center mb-6">
            <div className="h-8 bg-gray-200 rounded-lg mb-3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto animate-pulse"></div>
          </div>

          {/* Manager Card Skeleton */}
          <div className="border-2 border-gray-200 rounded-lg p-6 mb-6 bg-gray-50">
            {/* Photo Skeleton */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse"></div>
            </div>

            {/* Info Skeleton */}
            <div className="text-center">
              <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-2 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-32 mx-auto mb-3 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded-full w-48 mx-auto animate-pulse"></div>
            </div>
          </div>

          {/* WhatsApp Input Skeleton */}
          <div className="mb-6">
            <div className="h-14 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          {/* Button Skeleton */}
          <div className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>
    </main>
  )
}
