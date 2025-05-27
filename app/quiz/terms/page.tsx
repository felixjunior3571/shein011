import Link from "next/link"
import { Shield, Database, Building } from "lucide-react"

export default function QuizTermsPage() {
  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">Conta digital e cartão de crédito</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-8">Tudo o que você precisa em um só lugar</p>

          {/* Terms List */}
          <div className="space-y-4 mb-8">
            {/* Term 1 */}
            <div className="flex items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mr-4">
                <Shield className="w-6 h-6 text-gray-700" />
              </div>
              <p className="text-sm text-gray-700">Crédito sujeito à análise e aprovação.</p>
            </div>

            {/* Term 2 */}
            <div className="flex items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mr-4">
                <Database className="w-6 h-6 text-gray-700" />
              </div>
              <p className="text-sm text-gray-700">
                Os dados fornecidos por você a seguir serão utilizados para o processo de aquisição do cartão de
                crédito.
              </p>
            </div>

            {/* Term 3 */}
            <div className="flex items-start p-4 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mr-4">
                <Building className="w-6 h-6 text-gray-700" />
              </div>
              <p className="text-sm text-gray-700">
                Autorizo a consulta ao SCR - Sistema de Crédito do Banco Central e aos cadastros e órgãos de proteção ao
                crédito.
              </p>
            </div>
          </div>

          {/* Accept Button */}
          <Link
            href="/form"
            className="block w-full bg-black text-white text-center py-3 rounded-md font-medium hover:bg-black/90 transition-colors"
          >
            Li e concordo
          </Link>
        </div>
      </div>
    </main>
  )
}
