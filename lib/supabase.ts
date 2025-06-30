import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente para operações server-side (com service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Cliente para operações client-side
export const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Tipos para TypeScript
export interface Fatura {
  id: string
  external_id: string
  token: string
  status: string
  amount: number
  invoice_id?: string
  qr_code?: string
  pix_code?: string
  customer_name?: string
  customer_email?: string
  customer_document?: string
  created_at: string
  expires_at: string
  updated_at: string
}

// Helper functions
export async function createFatura(data: Partial<Fatura>) {
  const { data: fatura, error } = await supabaseAdmin.from("faturas").insert(data).select().single()

  if (error) {
    console.error("Erro ao criar fatura:", error)
    throw new Error(`Erro ao criar fatura: ${error.message}`)
  }

  return fatura
}

export async function getFaturaByToken(token: string) {
  const { data: fatura, error } = await supabaseAdmin.from("faturas").select("*").eq("token", token).single()

  if (error) {
    console.error("Erro ao buscar fatura por token:", error)
    return null
  }

  return fatura
}

export async function getFaturaByExternalId(external_id: string) {
  const { data: fatura, error } = await supabaseAdmin
    .from("faturas")
    .select("*")
    .eq("external_id", external_id)
    .single()

  if (error) {
    console.error("Erro ao buscar fatura por external_id:", error)
    return null
  }

  return fatura
}

export async function updateFaturaStatus(external_id: string, status: string) {
  const { data: fatura, error } = await supabaseAdmin
    .from("faturas")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("external_id", external_id)
    .select()
    .single()

  if (error) {
    console.error("Erro ao atualizar status da fatura:", error)
    throw new Error(`Erro ao atualizar status: ${error.message}`)
  }

  return fatura
}

export async function cleanExpiredFaturas() {
  const { error } = await supabaseAdmin.from("faturas").delete().lt("expires_at", new Date().toISOString())

  if (error) {
    console.error("Erro ao limpar faturas expiradas:", error)
  }
}
