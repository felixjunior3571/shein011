export default function Loading() {
  return (
    <div className="min-h-full bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
        <p>Carregando informações da gerente...</p>
      </div>
    </div>
  )
}
