"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Package, Truck, CreditCard } from "lucide-react"

interface OrderSummary {
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    size: string
    color: string
    image: string
  }>
  subtotal: number
  shippingMethod: string
  shippingCost: number
  total: number
  paymentMethod: string
  address: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
}

const getShippingCost = (method: string): number => {
  switch (method) {
    case "SEDEX":
      return 34.9
    case "Express":
      return 29.58
    case "PAC":
      return 27.97
    default:
      return 0
  }
}

export default function FinalConfirmation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null)
  const [orderNumber] = useState(() => Math.random().toString(36).substr(2, 9).toUpperCase())

  useEffect(() => {
    // Recuperar dados do carrinho e informações de envio/pagamento
    const cartItems = JSON.parse(localStorage.getItem("cartItems") || "[]")
    const shippingMethod = searchParams.get("shipping") || localStorage.getItem("selectedShipping") || "PAC"
    const paymentMethod = searchParams.get("payment") || localStorage.getItem("selectedPayment") || "Cartão de Crédito"
    const savedAddress = JSON.parse(localStorage.getItem("shippingAddress") || "{}")

    if (cartItems.length === 0) {
      router.push("/cart")
      return
    }

    const subtotal = cartItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0)
    const shippingCost = getShippingCost(shippingMethod)
    const total = subtotal + shippingCost

    setOrderSummary({
      items: cartItems,
      subtotal,
      shippingMethod,
      shippingCost,
      total,
      paymentMethod,
      address: savedAddress,
    })

    // Limpar carrinho após confirmação
    localStorage.removeItem("cartItems")
    localStorage.removeItem("selectedShipping")
    localStorage.removeItem("selectedPayment")
  }, [searchParams, router])

  const handleContinueShopping = () => {
    router.push("/")
  }

  if (!orderSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p>Processando seu pedido...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header de Confirmação */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pedido Confirmado!</h1>
          <p className="text-gray-600">Obrigado pela sua compra. Seu pedido foi processado com sucesso.</p>
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg inline-block">
            <p className="text-green-800 font-semibold">Número do Pedido: #{orderNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resumo do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderSummary.items.map((item) => (
                <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      Tamanho: {item.size} | Cor: {item.color}
                    </p>
                    <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                    <p className="font-semibold text-sm">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R$ {orderSummary.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Frete ({orderSummary.shippingMethod}):</span>
                  <span>R$ {orderSummary.shippingCost.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>R$ {orderSummary.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Entrega e Pagamento */}
          <div className="space-y-6">
            {/* Endereço de Entrega */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p>
                    {orderSummary.address.street}, {orderSummary.address.number}
                  </p>
                  {orderSummary.address.complement && <p>{orderSummary.address.complement}</p>}
                  <p>{orderSummary.address.neighborhood}</p>
                  <p>
                    {orderSummary.address.city} - {orderSummary.address.state}
                  </p>
                  <p>CEP: {orderSummary.address.zipCode}</p>
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 text-sm font-medium">Método de Envio: {orderSummary.shippingMethod}</p>
                  <p className="text-blue-600 text-sm">
                    Prazo de entrega:{" "}
                    {orderSummary.shippingMethod === "SEDEX"
                      ? "1-2 dias úteis"
                      : orderSummary.shippingMethod === "Express"
                        ? "2-3 dias úteis"
                        : "5-7 dias úteis"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Método de Pagamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Método de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{orderSummary.paymentMethod}</p>
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm font-medium">Pagamento Processado com Sucesso</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Próximos Passos */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-1">Confirmação por Email</h3>
                <p className="text-gray-600">Você receberá um email de confirmação em breve</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-1">Preparação</h3>
                <p className="text-gray-600">Seu pedido será preparado e embalado</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-1">Entrega</h3>
                <p className="text-gray-600">Acompanhe o status da entrega por email</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão para Continuar Comprando */}
        <div className="text-center mt-8">
          <Button onClick={handleContinueShopping} className="bg-black text-white hover:bg-gray-800 px-8 py-3">
            Continuar Comprando
          </Button>
        </div>
      </div>
    </div>
  )
}
