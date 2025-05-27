"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function LoadingAnalysisPage() {
  const router = useRouter()
  const [progress, setProgress] = useState(20)
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    "Aguardando resposta do sistema...",
    "Analisando seu perfil...",
    "Verificando limite disponível...",
    "Preparando seu cartão...",
  ]

  useEffect(() => {
    // Increment progress and step every second
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 5
      })
    }, 500)

    // Update current step
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval)
          return steps.length - 1
        }
        return prev + 1
      })
    }, 2000)

    // Redirect to card approval page after 8 seconds
    const timer = setTimeout(() => {
      router.push("/card-approved")
    }, 8000)

    return () => {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      clearTimeout(timer)
    }
  }, [router, steps.length])

  return (
    <main className="min-h-full bg-gray-50">
      {/* Loading Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h2 className="text-center text-lg font-medium mb-6">Aguarde enquanto processamos seu pedido</h2>

          {/* Credit Card - Ultra realistic */}
          <div className="bg-black text-white rounded-xl p-4 sm:p-6 mb-8 relative w-full aspect-[1.6/1] shadow-lg overflow-hidden max-w-sm mx-auto">
            {/* Subtle gradient overlay for realism */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-50 z-0"></div>

            {/* Card content */}
            <div className="relative z-10">
              {/* Top row */}
              <div className="flex justify-between items-start mb-4 sm:mb-8">
                <div className="text-white font-medium text-lg">Cartão de Crédito</div>

                {/* NFC Symbol - Exact match to the provided image */}
                <div className="w-6 h-6 relative">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9.5 8.5C9.5 8.5 11 7 12 7C13 7 14.5 8.5 14.5 8.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7.5 6.5C7.5 6.5 10 4 12 4C14 4 16.5 6.5 16.5 6.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M5.5 4.5C5.5 4.5 9 1 12 1C15 1 18.5 4.5 18.5 4.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.5 11C11.5 11 12 10 12 10C12 10 12.5 11 12.5 11"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Chip */}
              <div className="mb-4 sm:mb-8">
                <div className="w-12 h-10 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-md relative overflow-hidden">
                  {/* Chip details */}
                  <div className="absolute inset-0.5 grid grid-cols-4 grid-rows-3 gap-0.5">
                    {Array(12)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="bg-yellow-600/80 rounded-sm"></div>
                      ))}
                  </div>
                  {/* Chip reflection */}
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent"></div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 bg-gray-700 rounded-full mb-8 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              {/* Bottom logos */}
              <div className="flex justify-between items-end">
                {/* Card Logo - Using the provided image */}
                <div className="h-6 w-12 sm:h-8 sm:w-16 relative">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-EHbxxtPKQaYDDthNTeh5SHv8qQmpVM.png"
                    alt="Bandeira do cartão"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* SHEIN Logo - White version */}
                <div className="h-4 w-12 sm:h-6 sm:w-16 relative">
                  <img
                    src="/shein-card-logo.png"
                    alt="SHEIN"
                    className="w-full h-full object-contain"
                    style={{ filter: "brightness(0) invert(1)" }}
                  />
                </div>
              </div>
            </div>

            {/* Subtle card shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
          </div>

          {/* Loading Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`w-5 h-5 mr-3 rounded-full border-2 border-gray-300 flex items-center justify-center ${
                    index <= currentStep ? "border-gray-500" : ""
                  }`}
                >
                  {index <= currentStep && (
                    <div className="w-3 h-3 rounded-full border-2 border-gray-500 animate-spin"></div>
                  )}
                </div>
                <span className={index <= currentStep ? "text-black" : "text-gray-400"}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
