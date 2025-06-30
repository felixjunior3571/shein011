import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export interface Fatura {
  id: string
  external_id: string
  token: string
  status: string
  invoice_id?: string
  qr_code?: string
  pix_code?: string
  amount?: number
  created_at: string
  expires_at: string
  updated_at: string
}
