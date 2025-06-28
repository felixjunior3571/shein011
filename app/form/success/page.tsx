"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle, User, Calendar, UserCheck } from "lucide-react"

interface CpfData {
  nome: string
  dataNascimento: string
  nomeMae: string
  cpf: string
}

export default function FormSuccessPage() {
  const [cpfData, setCpfData] = useState<CpfData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    try {
      const savedCpfData = localStorage.getItem("cpfConsultaData")

      console.log("Dados salvos no localStorage:", savedCpfData)

      if (savedCpfData) {
        try {
          const parsedData = JSON.parse(savedCpfData)
          console.log("Dados parseados:", parsedData)
          setCpfData(parsedData)
        } catch (parseError) {
          console.error("Erro ao fazer parse:", parseError)
          setHasError(true)
        }
      } else {
        console.log("Nenhum dado encontrado no localStorage")
        setHasError(true)
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return (
      <main className="min-h-full bg-gray-50">
        <div className="max-w-md mx-auto p-6 py-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </div>
      </main>
    )
  }

  if (hasError || !cpfData) {
    return (
      <main className="min-h-full bg-gray-50">
        <div className="max-w-md mx-auto p-6 py-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-600 mb-4">Erro ao carregar dados</h1>
            <p className="text-gray-600 mb-6">Não foi possível carregar os dados do CPF consultado.</p>
            <Link
              href="/form"
              className="inline-block bg-black text-white py-3 px-6 rounded-md font-medium hover:bg-black/90 transition-colors"
            >
              Tentar Novamente
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <h1 className="text-xl font-medium mb-6 text-center text-green-600 font-bold">
            Dados encontrados com sucesso!
          </h1>

          {/* Dados do CPF - Apenas os 3 campos da API */}
          <div className="space-y-4 mb-6">
            {/* Nome Completo */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <User className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-gray-600 text-sm font-medium mb-1">Nome Completo</label>
                <div className="text-gray-900 font-medium">{cpfData.nome}</div>
              </div>
            </div>

            {/* Data de Nascimento */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-gray-600 text-sm font-medium mb-1">Data de Nascimento</label>
                <div className="text-gray-900 font-medium">{cpfData.dataNascimento}</div>
              </div>
            </div>

            {/* Nome da Mãe */}
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <UserCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-gray-600 text-sm font-medium mb-1">Nome da Mãe</label>
                <div className="text-gray-900 font-medium">{cpfData.nomeMae}</div>
              </div>
            </div>
          </div>

          {/* Status da consulta */}
          <div className="border border-green-200 bg-green-50 rounded-md p-4 mb-6">
            <p className="text-green-700 font-medium text-center mb-2">Dados cadastrados com sucesso!</p>
            <p className="text-sm text-green-600 text-center">Iniciando cadastro de {cpfData.nome}</p>
          </div>

          {/* Continue Button */}
          <Link
            href="/quiz/final"
            className="block w-full bg-black text-white text-center py-3 rounded-md font-medium hover:bg-black/90 transition-colors"
          >
            Continuar
          </Link>
        </div>
      </div>
    </main>
  )
}
