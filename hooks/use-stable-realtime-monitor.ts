"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function useStableRealtimeMonitor(externalId: string) {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const supabaseRef = useRef<any>(null)
  const channelRef = useRef<any>(null)
  const hasRedirectedRef = useRef(false)

  useEffect(() => {
    if (!externalId || hasRedirectedRef.current) return

    console.log(`[StableRealtimeMonitor] 🚀 Iniciando monitor para: ${externalId}`)

    // Create Supabase client only once
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey)
    }

    const supabase = supabaseRef.current

    // Check if payment is already confirmed
    const checkExistingPayment = async () => {
      try {
        const { data, error } = await supabase
          .from("payment_webhooks")
          .select("*")
          .eq("external_id", externalId)
          .eq("status_code", 5)
          .single()

        if (data && !error) {
          console.log(`[StableRealtimeMonitor] ✅ Pagamento já confirmado encontrado:`, data)
          setPaymentConfirmed(true)
          handlePaymentConfirmed()
          return true
        }
      } catch (error) {
        console.log(`[StableRealtimeMonitor] ℹ️ Nenhum pagamento confirmado encontrado ainda`)
      }
      return false
    }

    const handlePaymentConfirmed = () => {
      if (hasRedirectedRef.current) return

      console.log(`[StableRealtimeMonitor] 🎉 PAGAMENTO CONFIRMADO! Redirecionando...`)
      hasRedirectedRef.current = true

      // Set flag in localStorage
      localStorage.setItem("paymentConfirmed", "true")

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/upp/001")
      }, 1000)
    }

    const setupRealtimeConnection = async () => {
      // Check existing payment first
      const alreadyPaid = await checkExistingPayment()
      if (alreadyPaid) return

      console.log(`[StableRealtimeMonitor] 🔌 Conectando ao Realtime AUTENTICADO`)

      // Create channel
      channelRef.current = supabase
        .channel(`payment_webhooks:${externalId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payment_webhooks",
            filter: `external_id=eq.${externalId}`,
          },
          (payload) => {
            console.log(`[StableRealtimeMonitor] 📨 Webhook recebido:`, payload)

            const record = payload.new || payload.record
            if (record && record.status_code === 5) {
              console.log(`[StableRealtimeMonitor] ✅ Status 5 detectado - Pagamento confirmado!`)
              setPaymentConfirmed(true)
              handlePaymentConfirmed()
            }
          },
        )
        .subscribe((status) => {
          console.log(`[StableRealtimeMonitor] 📡 Status da conexão Realtime: ${status}`)

          if (status === "SUBSCRIBED") {
            setIsConnected(true)
            console.log(
              `[StableRealtimeMonitor] ✅ Conectado ao Realtime AUTENTICADO - Aguardando webhooks da SuperPay!`,
            )
          } else if (status === "CLOSED") {
            setIsConnected(false)
            console.log(`[StableRealtimeMonitor] ⚠️ Conexão Realtime fechada`)
          }
        })
    }

    setupRealtimeConnection()

    // Cleanup function
    return () => {
      console.log(`[StableRealtimeMonitor] 🧹 Limpando conexão Realtime...`)

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      setIsConnected(false)
    }
  }, [externalId, router])

  return {
    isConnected,
    paymentConfirmed,
  }
}
