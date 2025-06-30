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
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
)

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
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

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // máximo 50 webhooks por minuto
  message: {
    error: "Limite de webhooks excedido",
    code: "WEBHOOK_RATE_LIMIT",
  },
})

app.use("/api/", limiter)
app.use("/api/webhook/", webhookLimiter)

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
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  })
})

// Rotas principais
app.use("/api/checkout", checkoutRoutes)
app.use("/api/webhook", webhookRoutes)
app.use("/api", statusRoutes)

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error("Erro não tratado:", err)

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "JSON inválido",
      code: "INVALID_JSON",
    })
  }

  res.status(500).json({
    error: "Erro interno do servidor",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
  })
})

// Rota 404
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint não encontrado",
    code: "NOT_FOUND",
    path: req.originalUrl,
  })
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM recebido. Encerrando servidor graciosamente...")
  server.close(() => {
    console.log("Servidor encerrado.")
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  console.log("SIGINT recebido. Encerrando servidor graciosamente...")
  server.close(() => {
    console.log("Servidor encerrado.")
    process.exit(0)
  })
})

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor SuperPayBR v4 rodando na porta ${PORT}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
})

module.exports = app
