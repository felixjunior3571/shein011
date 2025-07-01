"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface PaymentWebhook {
  id: number
  external_id: string
  gateway: string
  status_code: number
  status_name: string
  status_title: string
  status_description: string
  amount: number
  is_paid: boolean
  customer_id: string
  processed_at: string
}

export function useRealtimePaymentMonitor(externalId: string) {
  const [payment, setPayment] = useState<PaymentWebhook | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!externalId) {
      setIsLoading(false)
      return
    }

    console.log("🔍 Monitorando pagamento:", externalId)

    // Verificar se já existe um pagamento confirmado
    const checkExistingPayment = async () => {
      try {
        const { data, error } = await supabase
          .from("payment_webhooks")
          .select("*")
          .eq("external_id", externalId)
          .eq("is_paid", true)
          .order("processed_at", { ascending: false })
          .limit(1)

        if (error) {
          console.error("❌ Erro ao verificar pagamento:", error)
          setError(error.message)
          return
        }

        if (data && data.length > 0) {
          console.log("✅ Pagamento já confirmado encontrado:", data[0])
          setPayment(data[0])
          setIsLoading(false)

          // Redirecionar após 2 segundos
          setTimeout(() => {
            console.log("🚀 Redirecionando para ativação...")
            router.push("/upp/001")
          }, 2000)
          return
        }

        console.log("⏳ Pagamento ainda não confirmado, aguardando...")
        setIsLoading(false)
      } catch (err) {
        console.error("💥 Erro ao verificar pagamento:", err)
        setError(err instanceof Error ? err.message : "Erro desconhecido")
        setIsLoading(false)
      }
    }

    // Verificar pagamento existente
    checkExistingPayment()

    // Configurar listener do Realtime
    const channel = supabase
      .channel("payment-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payment_webhooks",
          filter: `external_id=eq.${externalId}`,
        },
        (payload) => {
          console.log("🔔 Realtime update recebido:", payload)

          const newPayment = payload.new as PaymentWebhook

          if (newPayment && newPayment.is_paid) {
            console.log("🎉 PAGAMENTO CONFIRMADO VIA REALTIME!")
            console.log("💰 Valor:", newPayment.amount)
            console.log("🆔 External ID:", newPayment.external_id)

            setPayment(newPayment)
            setError(null)

            // Redirecionar após 2 segundos
            setTimeout(() => {
              console.log("🚀 Redirecionando para ativação...")
              router.push("/upp/001")
            }, 2000)
          } else {
            console.log("📝 Status do pagamento atualizado:", newPayment?.status_name)
            setPayment(newPayment)
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Status da conexão Realtime:", status)
        if (status === "SUBSCRIBED") {
          console.log("✅ Conectado ao Realtime para:", externalId)
        }
      })

    // Cleanup
    return () => {
      console.log("🧹 Limpando listener do Realtime")
      supabase.removeChannel(channel)
    }
  }, [externalId, router])

  return {
    payment,
    isLoading,
    error,
    isPaid: payment?.is_paid || false,
  }
}
