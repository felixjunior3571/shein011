"use client"

import type React from "react"

import Image from "next/image"
import { Shield, Clock, CreditCard, HelpCircle, Lock, FileCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      router.push("/quiz")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Overlay transparente para capturar cliques */}
      <div className="fixed inset-0 z-40 cursor-pointer" onClick={handleBackgroundClick}></div>

      {/* Header */}
      <header className="relative z-50 bg-white py-4 flex justify-center border-b">
        <Link href="/" className="flex items-center">
          <div className="relative w-[120px] h-[40px]">
            <Image src="/shein-logo.png" alt="SHEIN" fill style={{ objectFit: "contain" }} priority />
          </div>
        </Link>
      </header>

      {/* Hero Section */}
      <section className="relative h-[450px] sm:h-[500px] lg:h-[600px] flex items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/clothing-store-interior.png"
            alt="SHEIN store"
            fill
            className="object-cover brightness-75"
            priority
          />
        </div>
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto">
          <div className="bg-black/40 py-2 px-4 rounded-full inline-flex items-center mb-6">
            <Shield size={14} className="mr-2 flex-shrink-0" />
            <span className="text-sm whitespace-nowrap">Sem consulta ao SPC/Serasa</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            Solicite seu cartão Shein
            <br />
            em menos de 5 minutos
          </h1>

          <p className="text-sm sm:text-base lg:text-lg mb-6 max-w-2xl mx-auto leading-relaxed px-2">
            Com o Shein Cartão de Crédito, você tem acesso a promoções especiais, descontos incríveis e acumula pontos
            para trocar por passagens aéreas, upgrades de classe e muito mais!
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-6 px-2">
            <div className="bg-white text-black rounded-full py-2 px-3 flex items-center">
              <Shield size={12} className="mr-2 flex-shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">Site Seguro</span>
            </div>
            <div className="bg-white text-black rounded-full py-2 px-3 flex items-center">
              <Lock size={12} className="mr-2 flex-shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">Dados Protegidos</span>
            </div>
            <div className="bg-white text-black rounded-full py-2 px-3 flex items-center">
              <FileCheck size={12} className="mr-2 flex-shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">Aprovação Garantida</span>
            </div>
          </div>

          <Link
            href="/quiz"
            className="relative z-50 bg-black hover:bg-black/80 text-white font-bold py-3 px-6 rounded-md transition inline-block text-sm"
          >
            SOLICITAR MEU CARTÃO
          </Link>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Como funciona?</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span>1</span>
              </div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Responda o Formulário</h3>
              <p className="text-sm text-gray-600">Apenas 4 perguntas rápidas para analisarmos seu perfil</p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span>2</span>
              </div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Análise Instantânea</h3>
              <p className="text-sm text-gray-600">Resultado em segundos, sem consulta ao SPC/Serasa</p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6 bg-gray-50 rounded-lg sm:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span>3</span>
              </div>
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold mb-2">Receba seu Cartão</h3>
              <p className="text-sm text-gray-600">Cartão virtual na hora e físico em até 7 dias úteis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 px-4 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Zero Anuidade */}
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1L13.5 2.5L16.17 5.17C15.24 5.06 14.32 5 13.4 5H10.6C9.68 5 8.76 5.06 7.83 5.17L10.5 2.5L9 1L3 7V9H4.27C4.1 9.64 4 10.31 4 11V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V11C20 10.31 19.9 9.64 19.73 9H21ZM18 20H6V11C6 9.9 6.9 9 8 9H16C17.1 9 18 9.9 18 11V20Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">Zero Anuidade</h3>
              <p className="text-sm text-gray-600">Economize mais de R$ 500 por ano em anuidades</p>
            </div>

            {/* Limite Flexível */}
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">Limite Flexível</h3>
              <p className="text-sm text-gray-600">Aumente seu limite conforme usa o cartão</p>
            </div>

            {/* Cashback Garantido */}
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M19 15L20.25 18.5L24 19L20.25 19.5L19 23L17.75 19.5L14 19L17.75 18.5L19 15Z"
                      fill="currentColor"
                    />
                    <path d="M5 15L6.25 18.5L10 19L6.25 19.5L5 23L3.75 19.5L0 19L3.75 18.5L5 15Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">Cashback Garantido</h3>
              <p className="text-sm text-gray-600">Receba até 5% de volta em todas as suas compras</p>
            </div>

            {/* Benefícios Exclusivos */}
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">Benefícios Exclusivos</h3>
              <p className="text-sm text-gray-600">Descontos especiais em lojas parceiras</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
