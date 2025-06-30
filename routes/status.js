const express = require("express")
const router = express.Router()
const supabase = require("../supabaseClient")

/**
 * GET /verifica-status?token=...
 * Verifica status do pagamento via token (consulta apenas Supabase)
 */
router.get("/", async (req, res) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token é obrigatório",
      })
    }

    console.log("🔍 Verificando status para token:", token)

    // Buscar pagamento no Supabase (NUNCA na SuperPay)
    const { data: payment, error: dbError } = await supabase.from("payments").select("*").eq("token", token).single()

    if (dbError) {
      console.error("❌ Erro ao buscar pagamento:", dbError)

      if (dbError.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          error: "Token inválido ou expirado",
        })
      }

      throw dbError
    }

    // Verificar se token expirou
    const now = new Date()
    const expiresAt = new Date(payment.expires_at)

    if (now > expiresAt && payment.status === "pendente") {
      // Atualizar status para vencido
      await supabase
        .from("payments")
        .update({
          status: "vencido",
          updated_at: now.toISOString(),
        })
        .eq("token", token)

      payment.status = "vencido"
    }

    console.log("📊 Status encontrado:", {
      token,
      status: payment.status,
      external_id: payment.external_id,
      expired: now > expiresAt,
    })

    // Preparar resposta baseada no status
    const response = {
      success: true,
      data: {
        external_id: payment.external_id,
        status: payment.status,
        amount: payment.amount,
        created_at: payment.created_at,
        expires_at: payment.expires_at,
      },
    }

    // Adicionar campos específicos baseados no status
    switch (payment.status) {
      case "pago":
        response.data.paid = true
        response.data.paid_at = payment.paid_at
        response.data.message = "Pagamento confirmado com sucesso!"
        response.data.redirect = "/obrigado"
        break

      case "pendente":
        response.data.paid = false
        response.data.message = "Aguardando confirmação do pagamento"
        response.data.qr_code = payment.qr_code
        response.data.pix_code = payment.pix_code
        break

      case "vencido":
        response.data.paid = false
        response.data.message = "Pagamento vencido. Gere um novo PIX."
        response.data.expired = true
        break

      case "cancelado":
        response.data.paid = false
        response.data.message = "Pagamento foi cancelado."
        break

      case "recusado":
        response.data.paid = false
        response.data.message = "Pagamento foi recusado pelo banco."
        break

      case "estornado":
        response.data.paid = false
        response.data.message = "Pagamento foi estornado."
        break

      default:
        response.data.paid = false
        response.data.message = "Status do pagamento desconhecido."
    }

    res.json(response)
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error)

    res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    })
  }
})

module.exports = router
