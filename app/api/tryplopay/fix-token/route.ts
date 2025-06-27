import { NextResponse } from "next/server"

export async function GET() {
  const currentConfig = {
    timestamp: new Date().toISOString(),
    environment_variables: {
      TRYPLOPAY_TOKEN: {
        configured: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN
          ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 5)}...${process.env.TRYPLOPAY_TOKEN.substring(-3)}`
          : "não configurado",
        format_analysis: {
          looks_like_base64: process.env.TRYPLOPAY_TOKEN
            ? /^[A-Za-z0-9+/=]+$/.test(process.env.TRYPLOPAY_TOKEN)
            : false,
          has_special_chars: process.env.TRYPLOPAY_TOKEN ? /[^A-Za-z0-9]/.test(process.env.TRYPLOPAY_TOKEN) : false,
          starts_with_bearer: process.env.TRYPLOPAY_TOKEN?.startsWith("Bearer ") || false,
        },
      },
      TRYPLOPAY_API_URL: {
        configured: !!process.env.TRYPLOPAY_API_URL,
        value: process.env.TRYPLOPAY_API_URL || "não configurado",
        is_correct: process.env.TRYPLOPAY_API_URL === "https://api.tryplopay.com",
      },
      TRYPLOPAY_SECRET_KEY: {
        configured: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 5)}...${process.env.TRYPLOPAY_SECRET_KEY.substring(-3)}`
          : "não configurado",
      },
      TRYPLOPAY_WEBHOOK_URL: {
        configured: !!process.env.TRYPLOPAY_WEBHOOK_URL,
        value: process.env.TRYPLOPAY_WEBHOOK_URL || "não configurado",
      },
    },
    diagnosis: {
      main_issue: "Token inválido ou expirado",
      error_message: "AccessToken is Invalid or Expired",
      possible_causes: [
        "Token foi gerado incorretamente",
        "Token expirou",
        "Token não tem as permissões necessárias",
        "Formato do token está incorreto",
        "Conta TryploPay foi suspensa ou desativada",
      ],
      immediate_solutions: [
        "Gerar um novo token no dashboard TryploPay",
        "Verificar se a conta está ativa",
        "Confirmar permissões do token",
        "Testar com token de desenvolvimento primeiro",
      ],
    },
    step_by_step_fix: [
      {
        step: 1,
        title: "Acesse o Dashboard TryploPay",
        action: "Vá para https://dashboard.tryplopay.com",
        details: "Faça login com suas credenciais",
      },
      {
        step: 2,
        title: "Navegue para API Keys",
        action: "Clique em 'API' ou 'Integrações' no menu",
        details: "Procure pela seção de tokens/chaves de API",
      },
      {
        step: 3,
        title: "Revogue o Token Atual",
        action: "Desative/delete o token atual se existir",
        details: "Isso garante que não há conflitos",
      },
      {
        step: 4,
        title: "Gere um Novo Token",
        action: "Clique em 'Gerar Novo Token' ou 'Create API Key'",
        details: "Certifique-se de selecionar todas as permissões necessárias",
      },
      {
        step: 5,
        title: "Copie o Token Completo",
        action: "Copie o token inteiro, incluindo todos os caracteres",
        details: "Não adicione 'Bearer ' no início - isso é feito automaticamente",
      },
      {
        step: 6,
        title: "Atualize no Vercel",
        action: "Vá para Settings > Environment Variables no Vercel",
        details: "Substitua o valor de TRYPLOPAY_TOKEN pelo novo token",
      },
      {
        step: 7,
        title: "Faça um Redeploy",
        action: "Clique em 'Redeploy' no Vercel",
        details: "Isso aplicará as novas variáveis de ambiente",
      },
      {
        step: 8,
        title: "Teste a Conexão",
        action: "Acesse /api/tryplopay/test-connection",
        details: "Verifique se o erro 401 foi resolvido",
      },
    ],
    test_endpoints: [
      {
        name: "Teste de Conexão",
        url: "/api/tryplopay/test-connection",
        description: "Verifica se as credenciais estão funcionando",
      },
      {
        name: "Validador de Token",
        url: "/api/tryplopay/token-validator",
        description: "Testa diferentes métodos de autenticação",
      },
      {
        name: "Checkout de Teste",
        url: "/checkout",
        description: "Testa o fluxo completo de pagamento",
      },
    ],
    emergency_contacts: {
      tryplopay_support: "suporte@tryplopay.com",
      documentation: "https://docs.tryplopay.com/api",
      status_page: "https://status.tryplopay.com",
    },
  }

  return NextResponse.json(currentConfig)
}

export async function POST() {
  // Endpoint para testar um novo token sem precisar fazer deploy
  try {
    const testToken = "seu_novo_token_aqui" // Substitua pelo token real para teste
    const testUrl = "https://api.tryplopay.com/invoices"

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${testToken}`,
      },
    })

    const responseText = await response.text()
    let parsedResponse

    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      parsedResponse = { raw: responseText }
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      response: parsedResponse,
      test_token_preview: `${testToken.substring(0, 10)}...`,
      timestamp: new Date().toISOString(),
      message: response.ok
        ? "✅ Token funcionando! Atualize no Vercel e faça redeploy"
        : "❌ Token ainda não funciona. Verifique se está correto",
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "❌ Erro ao testar token",
    })
  }
}
