const express = require("express")
const { updateFaturaStatus, getFaturaByExternalId } = require("../supabaseClient")
const SuperPayService = require("../services/superpayService")

const router = express.Router()

// Mapeamento de códigos de status SuperPay
const STATUS_MAP = {
  1: "pendente", // Aguardando pagamento
  2: "processando", // Processando
  3: "processando", // Em análise
  4: "processando", // Aprovado (processando)
  5: "pago", // Pago/Confirmado
  6: "recusado", // Recusado
  7: "cancelado", // Cancelado
  8: "estornado", // Estornado
  9: "vencido", // Vencido
  10: "erro", // Erro
}

// Webhook principal da SuperPay
router.post("/superpay", async (req, res) => {
  try {
    console.log("🔔 Webhook SuperPay recebido:", {
      headers: req.headers,
      body: req.body,
    })

    const webhookData = req.body

    // Validações básicas
    if (!webhookData || !webhookData.external_id) {
      console.error("❌ Webhook inválido: external_id não encontrado")
      return res.status(400).json({
        success: false,
        error: "external_id obrigatório",
      })
    }

    if (!webhookData.status || !webhookData.status.code) {
      console.error("❌ Webhook inválido: status.code não encontrado")
      return res.status(400).json({
        success: false,
        error: "status.code obrigatório",
      })
    }

    const { external_id, status } = webhookData
    const statusCode = Number.parseInt(status.code)

    console.log(`🔄 Processando webhook: ${external_id} - Status: ${statusCode}`)

    // Validar assinatura (opcional mas recomendado)
    const signature = req.headers["x-superpay-signature"]
    if (signature && process.env.SUPERPAY_SECRET_KEY) {
      const superPayService = new SuperPayService()
      const isValidSignature = superPayService.validateWebhookSignature(webhookData, signature)

      if (!isValidSignature) {
        console.error("❌ Assinatura do webhook inválida")
        return res.status(401).json({
          success: false,
          error: "Assinatura inválida",
        })
      }
    }

    // Verificar se a fatura existe
    const fatura = await getFaturaByExternalId(external_id)
    if (!fatura) {
      console.error(`❌ Fatura não encontrada: ${external_id}`)
      return res.status(404).json({
        success: false,
        error: "Fatura não encontrada",
      })
    }

    // Mapear status
    const newStatus = STATUS_MAP[statusCode] || "desconhecido"

    console.log(`🔄 Atualizando status: ${external_id} de "${fatura.status}" para "${newStatus}"`)

    // Atualizar status no Supabase
    const updatedFatura = await updateFaturaStatus(external_id, newStatus, webhookData)

    // Log específico para pagamentos confirmados
    if (newStatus === "pago") {
      console.log(`💰 PAGAMENTO CONFIRMADO: ${external_id} - R$ ${fatura.amount}`)
    }

    // Resposta de sucesso (importante para SuperPay)
    res.status(200).json({
      success: true,
      message: "Webhook processado com sucesso",
      external_id: external_id,
      old_status: fatura.status,
      new_status: newStatus,
    })
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error)

    // Sempre retornar 200 para evitar reenvios desnecessários
    res.status(200).json({
      success: false,
      error: "Erro interno",
      message: "Webhook recebido mas não processado",
    })
  }
})

// Endpoint para testar webhook (desenvolvimento)
router.post("/test", async (req, res) => {
  try {
    const testData = {
      external_id: "FRETE_TEST_123456",
      status: {
        code: 5,
        name: "Pago",
      },
      amount: 29.9,
      paid_at: new Date().toISOString(),
    }

    console.log("🧪 Testando webhook com dados:", testData)

    // Simular processamento
    const result = await updateFaturaStatus(testData.external_id, "pago", testData)

    res.json({
      success: true,
      message: "Webhook de teste processado",
      data: result,
    })
  } catch (error) {
    console.error("❌ Erro no teste de webhook:", error)

    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Endpoint para listar webhooks recebidos (debug)
router.get("/debug", async (req, res) => {
  try {
    const { supabase } = require("../supabaseClient")

    const { data, error } = await supabase
      .from("faturas")
      .select("external_id, status, webhook_data, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    res.json({
      success: true,
      data: data,
      total: data.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

module.exports = router
