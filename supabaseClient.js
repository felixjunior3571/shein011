const { createClient } = require("@supabase/supabase-js")

// Verificar se as variáveis de ambiente estão definidas
if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL não está definida nas variáveis de ambiente")
}

if (!process.env.SUPABASE_KEY) {
  throw new Error("SUPABASE_KEY não está definida nas variáveis de ambiente")
}

// Criar cliente Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

// Função para testar conexão
async function testConnection() {
  try {
    const { data, error } = await supabase.from("payments").select("count").limit(1)

    if (error) {
      console.error("❌ Erro ao conectar com Supabase:", error.message)
      return false
    }

    console.log("✅ Conexão com Supabase estabelecida com sucesso")
    return true
  } catch (error) {
    console.error("❌ Erro de conexão Supabase:", error.message)
    return false
  }
}

module.exports = {
  supabase,
  testConnection,
}
