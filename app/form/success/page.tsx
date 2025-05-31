"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"

export default function FormSuccessPage() {
  const searchParams = useSearchParams()
  const [userData, setUserData] = useState({
    name: "",
    cpf: "",
    email: "",
  })

  const initialized = useRef(false)

  useEffect(() => {
    // Only set the data once
    if (!initialized.current) {
      // Get data from URL params or use default values
      const name = searchParams.get("name") || "Santos Silva"
      const cpf = searchParams.get("cpf") || "712.331.721-15"
      const email = searchParams.get("email") || "santosilva542234@gmail.com"

      setUserData({
        name,
        cpf,
        email,
      })

      // Salva o nome no localStorage para uso posterior
      if (name && name !== "Santos Silva") {
        localStorage.setItem("cardholderName", name)
      }

      initialized.current = true
    }
  }, [searchParams])

  return (
    <main className="min-h-full bg-gray-50">
      <div className="max-w-md mx-auto p-6 py-16">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-xl font-medium mb-6">Preencha o seus dados para cadastro</h1>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-gray-600 text-sm mb-1">Nome Completo</label>
              <div className="w-full p-3 bg-blue-50 rounded-md">{userData.name}</div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">CPF</label>
              <div className="w-full p-3 bg-blue-50 rounded-md">{userData.cpf}</div>
            </div>

            <div>
              <label className="block text-gray-600 text-sm mb-1">E-mail</label>
              <div className="w-full p-3 bg-blue-50 rounded-md">{userData.email}</div>
            </div>
          </div>

          <div className="border rounded-md p-4 mb-6">
            <p className="text-green-700 font-medium text-center mb-2">Dados cadastrados com sucesso!</p>

            <p className="mb-1">Iniciando cadastro de {userData.name}</p>

            <p className="mb-1">
              <span className="font-medium">E-mail:</span> {userData.email}
            </p>

            <p className="mb-4">
              <span className="font-medium">CPF:</span> {userData.cpf.replace(/[^\d]/g, "")}
            </p>

            <Link
              href="/quiz/final"
              className="block w-full bg-black text-white text-center py-3 rounded-md font-medium hover:bg-black/90 transition-colors"
            >
              Continuar
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
