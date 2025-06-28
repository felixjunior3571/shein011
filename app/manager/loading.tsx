export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f2f2f2] font-sans">
      {/* Header */}
      <header className="flex items-center p-4 border-b border-gray-200 bg-white">
        <div className="ml-5 w-[125px] h-[40px] bg-gray-200 animate-pulse rounded"></div>
      </header>

      {/* Main Content */}
      <div className="px-5 py-5 max-w-2xl mx-auto -mt-4">
        <div className="bg-white rounded-xl shadow-lg p-5">
          {/* Title */}
          <div className="h-8 bg-gray-200 animate-pulse rounded mb-3 mx-auto w-48"></div>

          {/* Subtitle */}
          <div className="h-4 bg-gray-200 animate-pulse rounded mb-2 mx-auto w-80"></div>
          <div className="h-4 bg-gray-200 animate-pulse rounded mb-5 mx-auto w-64"></div>

          {/* Manager Card */}
          <div className="bg-[#fff7db] border border-[#ffbf00] rounded-xl p-5 pb-3 mb-5">
            {/* Manager Photo */}
            <div className="flex justify-center mb-3">
              <div className="w-[120px] h-[120px] bg-gray-200 animate-pulse rounded-full"></div>
            </div>

            {/* Manager Info */}
            <div className="h-4 bg-gray-200 animate-pulse rounded mb-1 mx-auto w-16"></div>
            <div className="h-6 bg-gray-200 animate-pulse rounded mb-2 mx-auto w-32"></div>

            {/* Badge */}
            <div className="flex justify-center mt-0">
              <div className="h-6 bg-gray-200 animate-pulse rounded-full w-40"></div>
            </div>
          </div>

          {/* WhatsApp Input */}
          <div className="flex items-center justify-center mb-2">
            <div className="w-5 h-5 bg-gray-200 animate-pulse rounded mr-3"></div>
            <div className="h-10 bg-gray-200 animate-pulse rounded flex-1"></div>
          </div>

          {/* Continue Button */}
          <div className="h-12 bg-gray-200 animate-pulse rounded-lg w-full"></div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#f9f9f9] border-t border-[#eaeaea] px-4 py-6 text-center mt-12">
        <div className="max-w-2xl mx-auto">
          <div className="h-3 bg-gray-200 animate-pulse rounded mb-1 mx-auto w-64"></div>
          <div className="h-3 bg-gray-200 animate-pulse rounded mb-2 mx-auto w-72"></div>
          <div className="h-3 bg-gray-200 animate-pulse rounded mx-auto w-48"></div>
        </div>
      </footer>
    </div>
  )
}
