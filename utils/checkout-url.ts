// Utilitário para gerenciar a URL do checkout
export interface CheckoutData {
  document?: string
  name?: string
  telephone?: string
  email?: string
}

export const buildCheckoutUrl = (baseUrl: string, params: CheckoutData): string => {
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      // Codifica valores especiais para URL
      const encodedValue = key === "telephone" ? encodeURIComponent(value) : value
      url.searchParams.set(key, encodedValue)
    }
  })

  return url.toString()
}

export const getCheckoutData = (): CheckoutData => {
  if (typeof window === "undefined") return {}

  try {
    const data = localStorage.getItem("checkoutData")
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export const updateCheckoutData = (newData: Partial<CheckoutData>): void => {
  if (typeof window === "undefined") return

  const existingData = getCheckoutData()
  const updatedData = { ...existingData, ...newData }

  localStorage.setItem("checkoutData", JSON.stringify(updatedData))

  // Atualiza a URL também
  const checkoutUrl = buildCheckoutUrl("/checkout", updatedData)
  localStorage.setItem("checkoutUrl", checkoutUrl)

  console.log("Checkout data updated:", updatedData)
  console.log("Checkout URL updated:", checkoutUrl)
}

export const getCheckoutUrl = (): string => {
  if (typeof window === "undefined") return "/checkout"

  return localStorage.getItem("checkoutUrl") || "/checkout"
}

// Função para limpar dados do checkout
export const clearCheckoutData = (): void => {
  if (typeof window === "undefined") return

  localStorage.removeItem("checkoutData")
  localStorage.removeItem("checkoutUrl")
}
