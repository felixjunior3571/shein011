import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    title: "🔧 Guia Completo de Configuração TryploPay",
    timestamp: new Date().toISOString(),
    current_status: {
      token_configured: !!process.env.TRYPLOPAY_TOKEN,
      token_length: process.env.TRYPLOPAY_TOKEN?.length || 0,
      api_url_configured: !!process.env.TRYPLOPAY_API_URL,
      secret_key_configured: !!process.env.TRYPLOPAY_SECRET_KEY,
      webhook_configured: !!process.env.TRYPLOPAY_WEBHOOK_URL,
    },
    steps: [
      {
        step: 1,
        title: "Acesse o Dashboard da TryploPay",
        description: "Vá para https://dashboard.tryplopay.com ou https://app.tryplopay.com",
        action: "Login na sua conta TryploPay",
      },
      {
        step: 2,
        title: "Navegue para API/Integrações",
        description: "Procure por 'API', 'Integrações', 'Tokens' ou 'Chaves de API'",
        action: "Encontre a seção de configuração de API",
      },
      {
        step: 3,
        title: "Gere um Novo Token",
        description: "Clique em 'Gerar Token', 'Nova Chave' ou 'Criar Token de API'",
        action: "Copie o token completo gerado",
      },
      {
        step: 4,
        title: "Configure no Vercel",
        description: "Acesse vercel.com/dashboard → Seu Projeto → Settings → Environment Variables",
        variables: [
          {
            name: "TRYPLOPAY_TOKEN",
            description: "Token de API da TryploPay",
            example: "abc123def456ghi789...",
          },
          {
            name: "TRYPLOPAY_API_URL",
            description: "URL base da API",
            example: "https://api.tryplopay.com",
          },
          {
            name: "TRYPLOPAY_SECRET_KEY",
            description: "Chave secreta (se necessário)",
            example: "secret_key_here",
          },
          {
            name: "TRYPLOPAY_WEBHOOK_URL",
            description: "URL do webhook",
            example: "https://seu-dominio.vercel.app/api/tryplopay/webhook",
          },
        ],
      },
      {
        step: 5,
        title: "Teste a Configuração",
        description: "Use os endpoints de teste para validar",
        test_endpoints: [
          "/api/tryplopay/token-validator",
          "/api/tryplopay/test-connection",
          "/api/tryplopay/auth-test",
        ],
      },
    ],
    common_issues: [
      {
        issue: "Token inválido ou expirado",
        solution: "Gere um novo token no dashboard da TryploPay",
      },
      {
        issue: "Erro 401 Unauthorized",
        solution: "Verifique se o token está correto e não expirou",
      },
      {
        issue: "Erro 404 Not Found",
        solution: "Confirme se a URL da API está correta",
      },
      {
        issue: "Headers incorretos",
        solution: "Use Authorization: Bearer {token}",
      },
    ],
    contact_info: {
      support: "Entre em contato com o suporte da TryploPay",
      documentation: "Consulte a documentação oficial da API",
      email: "suporte@tryplopay.com (exemplo)",
    },
    next_steps: [
      "1. Siga os passos acima para obter um token válido",
      "2. Configure as variáveis no Vercel",
      "3. Teste usando /api/tryplopay/token-validator",
      "4. Se funcionar, teste o checkout completo",
      "5. Configure o webhook para receber notificações",
    ],
  })
}
