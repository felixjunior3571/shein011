const { createClient } = require("@supabase/supabase-js")
require("dotenv").config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Variáveis SUPABASE_URL e SUPABASE_KEY são obrigatórias")
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase
