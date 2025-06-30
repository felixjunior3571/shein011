const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const { testConnection } = require("./supabaseClient")
const SuperPayService = require("./services/superpayService")

// Importar rotas
const checkoutRoutes = require("./routes/checkout")
const webhookRoutes = require("./routes/webhook")
const statusRoutes = require("./routes/status")

const app = express()
const PORT = process.env.PORT || 3000

// Middleware de segurança
app.use(
  helmet({
    contentSecurityPolicy: false, // Desabilitar CSP para desenvolvimento
  }),
)

// CORS configurado
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
  max: 100, // máximo 100 requests por IP
  message: {
    error: "Muitas requisições. Tente novamente em 15 minutos.",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// Middleware para parsing JSON
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check
app.get("/health", async (req, res) => {
  try {
    const supabaseOk = await testConnection()
    const superPayService = new SuperPayService()
    const superPayOk = await superPayService.testConnection()

    const status = {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        supabase: supabaseOk ? "connected" : "disconnected",
        superpay: superPayOk.success ? "connected" : "disconnected",
      },
      version: "1.0.0",
    }

    res.json(status)
  } catch (error) {
    console.error("❌ Health check error:", error)
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    })
  }
})

// Rotas da API
app.use("/api/checkout", checkoutRoutes)
app.use("/api/webhook", webhookRoutes)
app.use("/api", statusRoutes)

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error("❌ Erro não tratado:", error)

  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    code: "INTERNAL_SERVER_ERROR",
    timestamp: new Date().toISOString(),
  })
})

// Rota 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    code: "NOT_FOUND",
    path: req.originalUrl,
  })
})

// Iniciar servidor
async function startServer() {
  try {
    // Testar conexões
    console.log("🔄 Testando conexões...")

    const supabaseOk = await testConnection()
    if (!supabaseOk) {
      throw new Error("Falha na conexão com Supabase")
    }

    const superPayService = new SuperPayService()
    const superPayTest = await superPayService.testConnection()
    if (!superPayTest.success) {
      console.warn("⚠️ SuperPay não conectado:", superPayTest.error)
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`)
      console.log(`📍 Health check: http://localhost:${PORT}/health`)
      console.log(`🔔 Webhook URL: http://localhost:${PORT}/api/webhook/superpay`)
      console.log(`💳 Checkout: http://localhost:${PORT}/api/checkout`)
    })
  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error.message)
    process.exit(1)
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Recebido SIGTERM, encerrando servidor...")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("🛑 Recebido SIGINT, encerrando servidor...")
  process.exit(0)
})

// Iniciar
startServer()

module.exports = app
