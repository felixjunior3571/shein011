export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <h2 className="text-xl font-bold mb-2">Carregando Checkout...</h2>
        <p className="text-gray-600">Preparando seu pagamento PIX</p>
      </div>
    </div>
  )
}
