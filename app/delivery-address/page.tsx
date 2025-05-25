"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface AddressData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export default function DeliveryAddressPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    cep: "",
    rua: "",
    numero: "",
    semNumero: false,
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "AC",
  })
  const [isLoadingCep, setIsLoadingCep] = useState(false)
  const [cepError, setCepError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
      numero: checked ? "" : prev.numero,
    }))
  }

  const formatCep = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "")

    // Aplica a máscara 00000-000
    if (numbers.length <= 5) {
      return numbers
    } else {
      return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
    }
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const formattedCep = formatCep(value)

    setFormData((prev) => ({
      ...prev,
      cep: formattedCep,
    }))

    setCepError("")

    // Verifica se o CEP está completo (8 dígitos)
    const numbersOnly = formattedCep.replace(/\D/g, "")
    if (numbersOnly.length === 8) {
      setIsLoadingCep(true)

      try {
        const response = await fetch(`https://viacep.com.br/ws/${numbersOnly}/json/`)
        const data: AddressData = await response.json()

        if (data.logradouro) {
          setFormData((prev) => ({
            ...prev,
            rua: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf,
          }))
        } else {
          setCepError("CEP não encontrado")
        }
      } catch (error) {
        setCepError("Erro ao buscar CEP")
        console.error("Erro ao buscar CEP:", error)
      } finally {
        setIsLoadingCep(false)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Salva o endereço no localStorage para uso posterior
    const deliveryAddress = {
      street: formData.rua,
      number: formData.semNumero ? "S/N" : formData.numero,
      complement: formData.complemento,
      neighborhood: formData.bairro,
      city: formData.cidade,
      state: formData.estado,
      zipCode: formData.cep,
    }

    localStorage.setItem("deliveryAddress", JSON.stringify(deliveryAddress))

    // Redireciona para a página de método de envio
    router.push("/shipping-method")
  }

  const estados = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white py-4 flex justify-center border-b">
        <Image src="/shein-logo.png" alt="SHEIN" width={120} height={40} priority />
      </header>

      <div className="max-w-md mx-auto p-4 py-8 sm:p-6 sm:py-12">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">Endereço de Entrega</h1>

          {/* Subtitle */}
          <p className="text-center text-gray-600 mb-6">Informe onde você deseja receber seu cartão</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* CEP */}
            <div>
              <label htmlFor="cep" className="block text-sm font-medium text-center mb-1">
                CEP
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className={`w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black ${
                    cepError ? "border-red-500" : ""
                  }`}
                  required
                />
                {isLoadingCep && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  </div>
                )}
              </div>
              {cepError && <p className="text-red-500 text-xs mt-1 text-center">{cepError}</p>}
            </div>

            {/* Rua */}
            <div>
              <label htmlFor="rua" className="block text-sm font-medium text-center mb-1">
                Rua
              </label>
              <input
                type="text"
                id="rua"
                name="rua"
                value={formData.rua}
                onChange={handleChange}
                placeholder="Digite sua rua"
                className="w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                required
              />
            </div>

            {/* Número */}
            <div>
              <label htmlFor="numero" className="block text-sm font-medium text-center mb-1">
                Número
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  disabled={formData.semNumero}
                  required={!formData.semNumero}
                />
                <div className="flex items-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    id="semNumero"
                    name="semNumero"
                    checked={formData.semNumero}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="semNumero" className="text-sm">
                    Sem número
                  </label>
                </div>
              </div>
            </div>

            {/* Complemento */}
            <div>
              <label htmlFor="complemento" className="block text-sm font-medium text-center mb-1">
                Complemento (opcional)
              </label>
              <input
                type="text"
                id="complemento"
                name="complemento"
                value={formData.complemento}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black"
              />
            </div>

            {/* Bairro */}
            <div>
              <label htmlFor="bairro" className="block text-sm font-medium text-center mb-1">
                Bairro
              </label>
              <input
                type="text"
                id="bairro"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className="w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                required
              />
            </div>

            {/* Cidade e Estado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cidade" className="block text-sm font-medium text-center mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  required
                />
              </div>
              <div>
                <label htmlFor="estado" className="block text-sm font-medium text-center mb-1">
                  Estado
                </label>
                <select
                  id="estado"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="w-full p-3 border rounded-md focus:ring-1 focus:ring-black focus:border-black"
                  required
                >
                  {estados.map((estado) => (
                    <option key={estado} value={estado}>
                      {estado}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-black hover:bg-black/90 text-white font-bold py-3 px-4 rounded-md transition-colors"
              >
                Confirmar endereço
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
