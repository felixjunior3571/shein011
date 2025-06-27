import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    title: "🔧 Como Corrigir Credenciais TryploPay",
    problem: "AccessToken is Invalid or Expired",
    solution: {
      step1: {
        title: "1. Acesse o Dashboard TryploPay",
        url: "https://dashboard.tryplopay.com",
        action: "Faça login na sua conta TryploPay",
      },
      step2: {
        title: "2. Navegue para API/Integrações",
        action: "Procure pela seção de API Keys ou Tokens",
      },
      step3: {
        title: "3. Gere Novas Credenciais",
        action: "Crie um novo Token de API e Secret Key",
        note: "Anote as credenciais imediatamente - elas podem não ser mostradas novamente",
      },
      step4: {
        title: "4. Configure no Vercel",
        url: "https://vercel.com/dashboard",
        actions: [
          "Acesse seu projeto no Vercel",
          "Vá em Settings → Environment Variables",
          "Atualize TRYPLOPAY_TOKEN com o novo token",
          "Atualize TRYPLOPAY_SECRET_KEY com a nova secret key",
          "Confirme que TRYPLOPAY_API_URL = https://api.tryplopay.com",
        ],
      },
      step5: {
        title: "5. Faça Redeploy",
        action: "Faça um novo deploy para aplicar as mudanças",
        note: "As variáveis de ambiente só são atualizadas após redeploy",
      },
      step6: {
        title: "6. Teste a Conexão",
        action: "Acesse /api/tryplopay/debug-auth para verificar",
      },
    },
    current_config: {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN
          ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 5)}...${process.env.TRYPLOPAY_TOKEN.substring(-3)}`
          : "não configurado",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 5)}...${process.env.TRYPLOPAY_SECRET_KEY.substring(-3)}`
          : "não configurado",
      },
      TRYPLOPAY_API_URL: process.env.TRYPLOPAY_API_URL || "não configurado",
    },
    troubleshooting: {
      common_issues: [
        {
          issue: "Token expirado",
          solution: "Gere um novo token no dashboard TryploPay",
        },
        {
          issue: "Secret Key incorreta",
          solution: "Verifique se copiou a secret key completa",
        },
        {
          issue: "URL da API incorreta",
          solution: "Confirme que está usando https://api.tryplopay.com",
        },
        {
          issue: "Variáveis não atualizadas",
          solution: "Faça redeploy após alterar as variáveis",
        },
      ],
      contact_support: {
        email: "suporte@tryplopay.com",
        documentation: "https://docs.tryplopay.com",
        note: "Se o problema persistir, entre em contato com o suporte TryploPay",
      },
    },
    next_steps: [
      "1. Acesse https://dashboard.tryplopay.com",
      "2. Gere novas credenciais",
      "3. Atualize no Vercel",
      "4. Faça redeploy",
      "5. Teste em /api/tryplopay/debug-auth",
    ],
  })
}
