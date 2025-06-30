const { createClient } = require("@supabase/supabase-js")

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias")
}

// Cliente Supabase com service role (para operações de servidor)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Função para testar conexão
async function testConnection() {
  try {
    const { data, error } = await supabase.from("faturas").select("count(*)").limit(1)

    if (error) {
      console.error("❌ Erro ao conectar com Supabase:", error.message)
      return false
    }

    console.log("✅ Supabase conectado com sucesso")
    return true
  } catch (error) {
    console.error("❌ Erro de conexão Supabase:", error.message)
    return false
  }
}

// Função para criar fatura
async function createFatura(faturaData) {
  try {
    const { data, error } = await supabase.from("faturas").insert([faturaData]).select().single()

    if (error) {
      console.error("❌ Erro ao criar fatura:", error)
      throw new Error(`Erro ao salvar fatura: ${error.message}`)
    }

    console.log("✅ Fatura criada:", data.external_id)
    return data
  } catch (error) {
    console.error("❌ Erro ao criar fatura:", error)
    throw error
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
      throw new Error(`Erro ao buscar fatura: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("❌ Erro ao buscar fatura por token:", error)
    throw error
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
      throw new Error(`Erro ao buscar fatura: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error("❌ Erro ao buscar fatura por external_id:", error)
    throw error
  }
}

// Função para atualizar status da fatura
async function updateFaturaStatus(externalId, status, webhookData = null) {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Se foi pago, marcar paid_at
    if (status === "pago") {
      updateData.paid_at = new Date().toISOString()
    }

    // Salvar dados do webhook se fornecidos
    if (webhookData) {
      updateData.webhook_data = webhookData
    }

    const { data, error } = await supabase
      .from("faturas")
      .update(updateData)
      .eq("external_id", externalId)
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao atualizar fatura: ${error.message}`)
    }

    console.log(`✅ Fatura ${externalId} atualizada para: ${status}`)
    return data
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error)
    throw error
  }
}

// Função para limpar faturas expiradas
async function cleanupExpiredFaturas() {
  try {
    const { data, error } = await supabase.rpc("cleanup_expired_faturas")

    if (error) {
      throw new Error(`Erro ao limpar faturas: ${error.message}`)
    }

    console.log(`🧹 ${data} faturas expiradas removidas`)
    return data
  } catch (error) {
    console.error("❌ Erro ao limpar faturas:", error)
    throw error
  }
}

module.exports = {
  supabase,
  testConnection,
  createFatura,
  getFaturaByToken,
  getFaturaByExternalId,
  updateFaturaStatus,
  cleanupExpiredFaturas,
}
