const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const checkoutRoutes = require("./routes/checkout")
const webhookRoutes = require("./routes/webhook")
const statusRoutes = require("./routes/status")

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares de segurança
app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: "Muitas requisições, tente novamente em 15 minutos.",
})
app.use(limiter)

// Rate limiting específico para webhook (mais permissivo)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // máximo 50 webhooks por minuto
  skip: (req) => {
    // Verificar se é realmente da SuperPayBR (opcional)
    const userAgent = req.get("User-Agent") || ""
    return userAgent.includes("SuperPayBR") || userAgent.includes("superpay")
  },
})

// Middleware para parsing JSON
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Middleware de logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`)
  next()
})

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "SuperPayBR Integration",
  })
})

// Rotas principais
app.use("/api/checkout", checkoutRoutes)
app.use("/api/webhook", webhookLimiter, webhookRoutes)
app.use("/api/verifica-status", statusRoutes)

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error("❌ Erro não tratado:", err)

  // Log detalhado do erro
  console.error("Stack trace:", err.stack)
  console.error("Request details:", {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
  })

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Erro interno do servidor" : err.message,
    timestamp: new Date().toISOString(),
  })
})

// Middleware para rotas não encontradas
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor SuperPayBR rodando na porta ${PORT}`)
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)

  // Verificar variáveis de ambiente essenciais
  const requiredEnvVars = ["SUPERPAY_TOKEN", "SUPERPAY_SECRET_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

  if (missingVars.length > 0) {
    console.warn("⚠️  Variáveis de ambiente faltando:", missingVars.join(", "))
  } else {
    console.log("✅ Todas as variáveis de ambiente configuradas")
  }
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Recebido SIGTERM, encerrando servidor...")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("🛑 Recebido SIGINT, encerrando servidor...")
  process.exit(0)
})

module.exports = app
