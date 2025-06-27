import { NextResponse } from "next/server"

export async function GET() {
  const instructions = {
    title: "🔑 Como Obter um Novo Token TryploPay",
    current_problem: {
      error: "AccessToken is Invalid or Expired",
      status: 401,
      meaning: "Seu token atual não é válido ou expirou",
    },
    solution_steps: [
      {
        step: 1,
        title: "📱 Acesse o Dashboard",
        description: "Entre na sua conta TryploPay",
        action: "Vá para https://dashboard.tryplopay.com",
        screenshot_tip: "Você deve ver o painel principal com menu lateral",
      },
      {
        step: 2,
        title: "🔧 Encontre as Configurações de API",
        description: "Localize a seção de integrações ou API",
        action: "Procure por 'API', 'Integrações', 'Tokens' ou 'Chaves' no menu",
        common_locations: [
          "Menu lateral > API",
          "Menu lateral > Integrações",
          "Configurações > API Keys",
          "Desenvolvedor > Tokens",
        ],
      },
      {
        step: 3,
        title: "🗑️ Remova o Token Antigo",
        description: "Delete ou desative o token atual",
        action: "Encontre o token existente e clique em 'Deletar' ou 'Revogar'",
        why: "Evita conflitos e garante que você está usando o token mais recente",
      },
      {
        step: 4,
        title: "➕ Crie um Novo Token",
        description: "Gere um novo token de API",
        action: "Clique em 'Criar Token', 'Gerar Token' ou 'New API Key'",
        important_settings: [
          "Selecione todas as permissões necessárias",
          "Marque 'Criar Faturas' ou 'Create Invoices'",
          "Marque 'PIX' se houver opção específica",
          "Defina como 'Produção' se for para uso real",
        ],
      },
      {
        step: 5,
        title: "📋 Copie o Token Completo",
        description: "Copie todo o token gerado",
        action: "Clique no botão 'Copiar' ou selecione todo o texto",
        warnings: [
          "⚠️ NÃO adicione 'Bearer ' no início",
          "⚠️ Copie TODOS os caracteres",
          "⚠️ Não deixe espaços no início ou fim",
          "⚠️ Este token só aparece UMA VEZ",
        ],
      },
      {
        step: 6,
        title: "🔄 Atualize no Vercel",
        description: "Substitua o token nas variáveis de ambiente",
        action: "Vá para seu projeto no Vercel > Settings > Environment Variables",
        detailed_steps: [
          "Encontre a variável TRYPLOPAY_TOKEN",
          "Clique no ícone de editar (lápis)",
          "Cole o novo token",
          "Clique em 'Save'",
        ],
      },
      {
        step: 7,
        title: "🚀 Faça Redeploy",
        description: "Aplique as mudanças fazendo um novo deploy",
        action: "Clique em 'Redeploy' na aba Deployments do Vercel",
        alternative: "Ou faça um novo commit no seu repositório",
      },
      {
        step: 8,
        title: "✅ Teste a Conexão",
        description: "Verifique se o problema foi resolvido",
        action: "Acesse /api/tryplopay/test-connection",
        success_indicators: ["Status 200 ao invés de 401", "Mensagem de sucesso", "Token válido confirmado"],
      },
    ],
    troubleshooting: {
      "Token ainda inválido": [
        "Verifique se copiou o token completo",
        "Confirme se não há espaços extras",
        "Tente gerar um novo token",
        "Verifique se a conta TryploPay está ativa",
      ],
      "Não encontro onde gerar token": [
        "Entre em contato com suporte TryploPay",
        "Verifique se sua conta tem permissões de desenvolvedor",
        "Procure por 'Webhook' ou 'Integração' como alternativa",
      ],
      "Erro persiste após redeploy": [
        "Aguarde alguns minutos para propagação",
        "Verifique se salvou a variável corretamente",
        "Confirme se fez redeploy do ambiente correto",
        "Teste em uma nova aba/sessão",
      ],
    },
    quick_test: {
      description: "Teste rápido sem fazer deploy",
      endpoint: "/api/tryplopay/fix-token",
      method: "POST",
      instructions: "Substitua 'seu_novo_token_aqui' no código pelo token real e teste",
    },
    support_contacts: {
      tryplopay_support: {
        email: "suporte@tryplopay.com",
        description: "Suporte oficial da TryploPay",
      },
      documentation: {
        url: "https://docs.tryplopay.com",
        description: "Documentação oficial da API",
      },
      status_page: {
        url: "https://status.tryplopay.com",
        description: "Verifique se há problemas nos serviços",
      },
    },
  }

  return NextResponse.json(instructions)
}
