// Carregar variáveis de ambiente primeiro
require("dotenv").config()

// Verificar variáveis obrigatórias
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPERPAY_TOKEN", "SUPERPAY_SECRET_KEY"]

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error("❌ Variáveis de ambiente obrigatórias não configuradas:")
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`)
  })
  console.error("\n📝 Copie .env.example para .env e configure as variáveis")
  process.exit(1)
}

// Iniciar servidor
console.log("🚀 Iniciando sistema SuperPay + Supabase...")
console.log("📋 Configurações:")
console.log(`   - Node.js: ${process.version}`)
console.log(`   - Ambiente: ${process.env.NODE_ENV || "development"}`)
console.log(`   - Porta: ${process.env.PORT || 3000}`)
console.log(`   - Supabase: ${process.env.SUPABASE_URL}`)
console.log(`   - SuperPay: ${process.env.SUPERPAY_API_URL || "https://api.superpay.com.br"}`)

// Importar e iniciar servidor
require("./server.js")
