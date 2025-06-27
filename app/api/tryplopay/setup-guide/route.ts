import { NextResponse } from "next/server"

export async function GET() {
  const setupGuide = {
    title: "Guia de Configuração TryploPay",
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
        description: "Faça login na sua conta TryploPay para acessar as configurações de API",
        action: "Vá para: https://dashboard.tryplopay.com/api-keys",
        variables: [
          {
            name: "URL_DASHBOARD",
            description: "Link direto para o dashboard",
            example: "https://dashboard.tryplopay.com/api-keys",
          },
        ],
      },
      {
        step: 2,
        title: "Gere um Novo Token de API",
        description: "Crie um novo token de API com permissões para criar faturas PIX",
        action: "Clique em 'Gerar Novo Token' e copie o valor gerado",
        variables: [
          {
            name: "TRYPLOPAY_TOKEN",
            description: "Token de autenticação da API TryploPay",
            example: "seu_token_aqui_exemplo_123456789",
          },
        ],
      },
      {
        step: 3,
        title: "Obtenha a Chave Secreta",
        description: "Copie a chave secreta (Secret Key) da sua conta",
        action: "Encontre a 'Secret Key' nas configurações da API",
        variables: [
          {
            name: "TRYPLOPAY_SECRET_KEY",
            description: "Chave secreta para validação adicional",
            example: "sua_secret_key_aqui_exemplo_abcdef123456",
          },
        ],
      },
      {
        step: 4,
        title: "Configure as Variáveis no Vercel",
        description: "Adicione as variáveis de ambiente no painel do Vercel",
        action: "Vá para Settings > Environment Variables no seu projeto Vercel",
        variables: [
          {
            name: "TRYPLOPAY_TOKEN",
            description: "Token de API da TryploPay",
            example: process.env.TRYPLOPAY_TOKEN || "seu_token_aqui",
          },
          {
            name: "TRYPLOPAY_API_URL",
            description: "URL base da API TryploPay",
            example: "https://api.tryplopay.com",
          },
          {
            name: "TRYPLOPAY_SECRET_KEY",
            description: "Chave secreta da TryploPay",
            example: process.env.TRYPLOPAY_SECRET_KEY || "sua_secret_key_aqui",
          },
          {
            name: "TRYPLOPAY_WEBHOOK_URL",
            description: "URL do webhook para receber notificações",
            example: "https://seu-dominio.vercel.app/api/tryplopay/webhook",
          },
        ],
      },
      {
        step: 5,
        title: "Faça um Novo Deploy",
        description: "Após configurar as variáveis, faça um novo deploy do projeto",
        action: "Clique em 'Redeploy' no Vercel ou faça um novo commit",
      },
      {
        step: 6,
        title: "Teste a Integração",
        description: "Verifique se a integração está funcionando corretamente",
        action: "Acesse /api/tryplopay/test-connection para testar",
      },
    ],
    common_issues: [
      {
        issue: "Token inválido ou expirado (401 Unauthorized)",
        solution: "Gere um novo token no dashboard da TryploPay e atualize a variável TRYPLOPAY_TOKEN",
      },
      {
        issue: "API URL incorreta (404 Not Found)",
        solution: "Verifique se TRYPLOPAY_API_URL está configurada como https://api.tryplopay.com",
      },
      {
        issue: "Secret Key incorreta",
        solution: "Copie novamente a Secret Key do dashboard e atualize TRYPLOPAY_SECRET_KEY",
      },
      {
        issue: "Webhook não recebe notificações",
        solution: "Verifique se TRYPLOPAY_WEBHOOK_URL está acessível publicamente",
      },
      {
        issue: "Erro de CORS",
        solution: "Adicione os headers corretos nas requisições para a API",
      },
    ],
    next_steps: [
      "Configurar webhook para receber notificações de pagamento",
      "Implementar tratamento de erros personalizado",
      "Adicionar logs detalhados para monitoramento",
      "Configurar ambiente de teste separado",
    ],
    contact_info: {
      support_email: "suporte@tryplopay.com",
      documentation: "https://docs.tryplopay.com",
      status_page: "https://status.tryplopay.com",
    },
  }

  return NextResponse.json(setupGuide)
}
