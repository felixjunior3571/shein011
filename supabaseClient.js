const { createClient } = require("@supabase/supabase-js")

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.SUPABASE_URL) {
  throw new Error("❌ SUPABASE_URL não configurada")
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ SUPABASE_SERVICE_ROLE_KEY não configurada")
}

// Criar cliente Supabase com service role key (acesso total)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
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

    console.log("✅ Conexão com Supabase estabelecida")
    return true
  } catch (error) {
    console.error("❌ Erro de conexão Supabase:", error.message)
    return false
  }
}

// Função para inserir fatura
async function insertFatura(faturaData) {
  try {
    const { data, error } = await supabase.from("faturas").insert([faturaData]).select().single()

    if (error) {
      console.error("❌ Erro ao inserir fatura:", error)
      throw error
    }

    console.log("✅ Fatura inserida:", data.external_id)
    return data
  } catch (error) {
    console.error("❌ Erro na inserção:", error)
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
      throw error
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
        return null // External ID não encontrado
      }
      throw error
    }

    return data
  } catch (error) {
    console.error("❌ Erro ao buscar fatura por external_id:", error)
    throw error
  }
}

// Função para atualizar status da fatura
async function updateFaturaStatus(externalId, statusData) {
  try {
    const updateData = {
      status: statusData.status,
      webhook_data: statusData.webhookData,
      updated_at: new Date().toISOString(),
    }

    // Se foi pago, adicionar paid_at
    if (statusData.status === "pago") {
      updateData.paid_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from("faturas")
      .update(updateData)
      .eq("external_id", externalId)
      .select()
      .single()

    if (error) {
      console.error("❌ Erro ao atualizar fatura:", error)
      throw error
    }

    console.log(`✅ Fatura ${externalId} atualizada para: ${statusData.status}`)
    return data
  } catch (error) {
    console.error("❌ Erro na atualização:", error)
    throw error
  }
}

// Função para limpar faturas expiradas (opcional)
async function cleanExpiredFaturas() {
  try {
    const { data, error } = await supabase
      .from("faturas")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("status", "pendente")

    if (error) {
      console.error("❌ Erro ao limpar faturas expiradas:", error)
      return
    }

    if (data && data.length > 0) {
      console.log(`🧹 ${data.length} faturas expiradas removidas`)
    }
  } catch (error) {
    console.error("❌ Erro na limpeza:", error)
  }
}

module.exports = {
  supabase,
  testConnection,
  insertFatura,
  getFaturaByToken,
  getFaturaByExternalId,
  updateFaturaStatus,
  cleanExpiredFaturas,
}
