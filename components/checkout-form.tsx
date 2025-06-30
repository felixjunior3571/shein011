"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CheckoutData {
  token: string
  external_id: string
  qr_code: string
  pix_code: string
  amount: number
  expires_at: string
}

interface CheckoutFormProps {
  onCheckoutSuccess: (data: CheckoutData) => void
}

export function CheckoutForm({ onCheckoutSuccess }: CheckoutFormProps) {
  const [amount, setAmount] = useState("27.97")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: Number.parseFloat(amount),
          description: "Frete PAC - Cartão SHEIN",
          customer: {
            name: "Cliente SHEIN",
            email: "cliente@example.com",
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar checkout")
      }

      console.log("✅ Checkout criado:", data)
      onCheckoutSuccess(data)
    } catch (err: any) {
      console.error("❌ Erro no checkout:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Checkout PIX</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-2">
              Valor (R$)
            </label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="27.97"
              required
            />
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Criando PIX..." : "Gerar PIX"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
