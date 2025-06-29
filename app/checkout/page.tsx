"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useSuperpayWebhookMonitor } from "@/hooks/use-superpay-webhook-monitor"

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const externalId = searchParams.get("external_id")
  const [paymentData, setPaymentData] = useState(null)
  const [paymentStatus, setPaymentStatus] = useState("pending") // pending, confirmed, denied, expired, canceled, refunded
  const [notificationMessage, setNotificationMessage] = useState("")
  const [showNotification, setShowNotification] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/payment?external_id=${externalId}`)
        if (response.ok) {
          const data = await response.json()
          setPaymentData(data)
        } else {
          console.error("Failed to fetch payment data")
        }
      } catch (error) {
        console.error("Error fetching payment data:", error)
      }
    }

    if (externalId) {
      fetchData()
    }
  }, [externalId])

  // Monitoramento SuperPay via webhook
  const { status: superpayStatus, isChecking: superpayChecking } = useSuperpayWebhookMonitor({
    externalId: paymentData?.external_id || null,
    checkInterval: 3000, // 3 segundos
    onPaymentConfirmed: (data) => {
      console.log("🎉 Pagamento SuperPay confirmado!", data)
      setPaymentStatus("confirmed")
      setNotificationMessage("🎉 Pagamento confirmado! Redirecionando...")
      setShowNotification(true)
      setTimeout(() => {
        window.location.href = "/upp/001"
      }, 2000)
    },
    onPaymentDenied: (data) => {
      console.log("❌ Pagamento SuperPay negado!", data)
      setPaymentStatus("denied")
      setNotificationMessage("❌ Pagamento negado. Tente outro método de pagamento.")
      setShowNotification(true)
    },
    onPaymentExpired: (data) => {
      console.log("⏰ Pagamento SuperPay vencido!", data)
      setPaymentStatus("expired")
      setNotificationMessage("⏰ Pagamento vencido. Gere um novo PIX.")
      setShowNotification(true)
    },
    onPaymentCanceled: (data) => {
      console.log("🚫 Pagamento SuperPay cancelado!", data)
      setPaymentStatus("canceled")
      setNotificationMessage("🚫 Pagamento cancelado.")
      setShowNotification(true)
    },
    onPaymentRefunded: (data) => {
      console.log("🔄 Pagamento SuperPay estornado!", data)
      setPaymentStatus("refunded")
      setNotificationMessage("🔄 Pagamento estornado.")
      setShowNotification(true)
    },
  })

  return (
    <div className="container mx-auto py-10">
      <Toaster />
      <Card className="w-[500px] mx-auto">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
          <CardDescription>Complete your order</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="Your email" required type="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="plan">Plan</Label>
            <Select>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
          </div>
          {paymentData && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">External ID: {paymentData.external_id}</p>
              <p className="text-sm text-gray-700">Amount: {paymentData.amount}</p>
              <p className="text-sm text-gray-700">Status: {paymentData.status}</p>
            </div>
          )}

          {superpayStatus && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">Status SuperPay: {superpayStatus.statusName}</p>
              {superpayStatus.paymentDate && (
                <p className="text-xs text-blue-600">Data: {new Date(superpayStatus.paymentDate).toLocaleString()}</p>
              )}
            </div>
          )}

          <Button>Confirm order</Button>
        </CardContent>
      </Card>
    </div>
  )
}
