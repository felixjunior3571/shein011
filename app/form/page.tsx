"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"

// Função para formatar CPF
const formatCPF = (value: string) => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "")

  // Aplica a máscara 000.000.000-00
  if (numbers.length <= 3) {
    return numbers
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`
  }
}

// Função para validar CPF
const validateCPF = (cpf: string) => {
  // Remove formatação
  const numbers = cpf.replace(/\D/g, "")

  // Verifica se tem 11 dígitos
  if (numbers.length !== 11) {
    return false
  }

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(numbers)) {
    return false
  }

  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(numbers[i]) * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (Number.parseInt(numbers[9]) !== digit1) {
    return false
  }

  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += Number.parseInt(numbers[i]) * (11 - i)
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  if (Number.parseInt(numbers[10]) !== digit2) {
    return false
  }

  return true
}

export default function FormPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    email: "",
  })

  const [errors, setErrors] = useState({
    cpf: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    if (id === "cpf") {
      const formattedCpf = formatCPF(value)
      setFormData((prev) => ({
        ...prev,
        [id]: formattedCpf,
      }))

      // Validação em tempo real
      const numbers = formattedCpf.replace(/\D/g, "")
      if (numbers.length === 11) {
        if (validateCPF(formattedCpf)) {
          setErrors((prev) => ({ ...prev, cpf: "" }))
        } else {
          setErrors((prev) => ({ ...prev, cpf: "CPF inválido" }))
        }
      } else {
        setErrors((prev) => ({ ...prev, cpf: "" }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validação final do CPF
    if (!validateCPF(formData.cpf)) {
      setErrors((prev) => ({ ...prev, cpf: "CPF inválido" }))
      return
    }

    // Navigate to success page with form data as URL parameters
    router.push(
      `/form/success?name=${encodeURIComponent(formData.name)}&cpf=${encodeURIComponent(formData.cpf)}&email=${encodeURIComponent(formData.email)}`,
    )
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Form Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
          <h1 className="text-xl font-bold mb-6 text-center">Solicite seu cartão SHEIN</h1>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Nome completo
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border rounded-md text-base focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="Digite seu nome completo"
                required
              />
            </div>

            <div>
              <label htmlFor="cpf" className="block text-sm font-medium mb-2">
                CPF
              </label>
              <input
                type="text"
                id="cpf"
                value={formData.cpf}
                onChange={handleChange}
                className={`w-full p-3 border rounded-md text-base focus:ring-2 focus:ring-black focus:border-transparent ${
                  errors.cpf ? "border-red-500 focus:ring-red-500" : ""
                }`}
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
              {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                E-mail
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 border rounded-md text-base focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-black hover:bg-black/80 text-white font-bold py-3 px-4 rounded-md transition text-base"
              >
                SOLICITAR CARTÃO
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
