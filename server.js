require("dotenv").config()

const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const { testConnection } = require("./supabaseClient")
const SuperPayService = require("./services/superpayService")

const app = express()
const PORT = process.env.PORT || 3000

// Verificar variáveis de ambiente
const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPERPAY_TOKEN", "SUPERPAY_SECRET_KEY"]
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  console.error("❌ Variáveis de ambiente obrigatórias não configuradas:")
  missingVars.forEach((varName) => console.error(`   - ${varName}`))
  process.exit(1)
}

// Middlewares de segurança
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
)

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-superpay-signature"],
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." },
})

app.use("/api/", limiter)

// Parsing JSON
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check
app.get("/health", async (req, res) => {
  try {
    const supabaseOk = await testConnection()
    const superPayService = new SuperPayService()
    const superPayTest = await superPayService.testConnection()

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseOk ? "connected" : "disconnected",
        superpay: superPayTest.success ? "connected" : "disconnected",
      },
      version: "1.0.0",
    })
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
    })
  }
})

// Rotas
app.use("/api/checkout", require("./routes/checkout"))
app.use("/api/webhook", require("./routes/webhook"))
app.use("/api", require("./routes/status"))

// Error handler
app.use((error, req, res, next) => {
  console.error("❌ Erro não tratado:", error)
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    path: req.originalUrl,
  })
})

// Iniciar servidor
async function startServer() {
  try {
    console.log("🔄 Testando conexões...")

    const supabaseOk = await testConnection()
    if (!supabaseOk) {
      throw new Error("Falha na conexão com Supabase")
    }

    app.listen(PORT, () => {
      console.log(`🚀 Servidor SuperPay rodando na porta ${PORT}`)
      console.log(`📍 Health: http://localhost:${PORT}/health`)
      console.log(`🔔 Webhook: http://localhost:${PORT}/api/webhook/superpay`)
      console.log(`💳 Checkout: http://localhost:${PORT}/api/checkout`)
    })
  } catch (error) {
    console.error("❌ Erro ao iniciar:", error.message)
    process.exit(1)
  }
}

startServer()

module.exports = app
