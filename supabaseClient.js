const { createClient } = require("@supabase/supabase-js")

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL é obrigatória")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY é obrigatória")
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Cliente Supabase com configurações otimizadas
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-application-name": "superpay-integration",
    },
  },
})

// Função para testar conexão
async function testConnection() {
  try {
    const { data, error } = await supabase.from("faturas").select("count(*)").limit(1)

    if (error) {
      console.error("❌ Erro na conexão Supabase:", error.message)
      return false
    }

    console.log("✅ Conexão Supabase estabelecida com sucesso")
    return true
  } catch (err) {
    console.error("❌ Erro ao testar conexão Supabase:", err.message)
    return false
  }
}

// Função para criar fatura
async function createFatura(faturaData) {
  try {
    const { data, error } = await supabase.from("faturas").insert([faturaData]).select().single()

    if (error) {
      console.error("Erro ao criar fatura:", error)
      throw new Error(`Erro no banco: ${error.message}`)
    }

    console.log("✅ Fatura criada:", data.external_id)
    return data
  } catch (err) {
    console.error("Erro ao criar fatura:", err)
    throw err
  }
}

// Função para atualizar status da fatura
async function updateFaturaStatus(externalId, statusData) {
  try {
    const { data, error } = await supabase
      .from("faturas")
      .update(statusData)
      .eq("external_id", externalId)
      .select()
      .single()

    if (error) {
      console.error("Erro ao atualizar fatura:", error)
      throw new Error(`Erro no banco: ${error.message}`)
    }

    if (!data) {
      throw new Error("Fatura não encontrada")
    }

    console.log("✅ Fatura atualizada:", externalId, statusData)
    return data
  } catch (err) {
    console.error("Erro ao atualizar fatura:", err)
    throw err
  }
}

// Função para buscar fatura por token
async function getFaturaByToken(token) {
  try {
    const { data, error } = await supabase.from("faturas").select("*").eq("token", token).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Token não encontrado
      }
      throw new Error(`Erro no banco: ${error.message}`)
    }

    return data
  } catch (err) {
    console.error("Erro ao buscar fatura por token:", err)
    throw err
  }
}

// Função para buscar fatura por external_id
async function getFaturaByExternalId(externalId) {
  try {
    const { data, error } = await supabase.from("faturas").select("*").eq("external_id", externalId).single()

    if (error) {
      if (error.code === "PGRST116") {
        return null // Fatura não encontrada
      }
      throw new Error(`Erro no banco: ${error.message}`)
    }

    return data
  } catch (err) {
    console.error("Erro ao buscar fatura por external_id:", err)
    throw err
  }
}

// Função para limpeza de faturas expiradas
async function cleanupExpiredFaturas() {
  try {
    const { data, error } = await supabase.rpc("cleanup_expired_faturas")

    if (error) {
      console.error("Erro na limpeza:", error)
      return false
    }

    console.log("✅ Limpeza de faturas expiradas executada")
    return true
  } catch (err) {
    console.error("Erro na limpeza:", err)
    return false
  }
}

module.exports = {
  supabase,
  testConnection,
  createFatura,
  updateFaturaStatus,
  getFaturaByToken,
  getFaturaByExternalId,
  cleanupExpiredFaturas,
}
