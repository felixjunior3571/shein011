const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares de segurança
app.use(helmet())
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  }),
)

// Middlewares de parsing
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Importar rotas
const checkoutRoutes = require("./routes/checkout")
const webhookRoutes = require("./routes/webhook")
const statusRoutes = require("./routes/status")

// Configurar rotas
app.use("/checkout", checkoutRoutes)
app.use("/webhook/superpay", webhookRoutes)
app.use("/verifica-status", statusRoutes)

// Rota de health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "SuperPay Integration API está funcionando",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// Rota raiz
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SuperPay Integration API v1.0.0",
    endpoints: {
      checkout: "POST /checkout",
      webhook: "POST /webhook/superpay",
      status: "GET /verifica-status?token=...",
      health: "GET /health",
    },
  })
})

// Middleware de erro 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    path: req.originalUrl,
  })
})

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error("❌ Erro não tratado:", error)
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log("🚀 SuperPay Integration API iniciada!")
  console.log(`📡 Servidor rodando na porta ${PORT}`)
  console.log(`🌐 Health check: http://localhost:${PORT}/health`)
  console.log(`📋 Endpoints disponíveis:`)
  console.log(`   POST /checkout - Criar fatura PIX`)
  console.log(`   POST /webhook/superpay - Receber webhooks`)
  console.log(`   GET /verifica-status?token=... - Verificar status`)
  console.log("")
  console.log("✅ Sistema pronto para produção!")
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
