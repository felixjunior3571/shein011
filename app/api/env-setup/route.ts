import { NextResponse } from "next/server"

export async function GET() {
  const envStatus = {
    timestamp: new Date().toISOString(),
    message: "Status das Variáveis de Ambiente TryploPay",
    variables: {
      TRYPLOPAY_TOKEN: {
        exists: !!process.env.TRYPLOPAY_TOKEN,
        value: process.env.TRYPLOPAY_TOKEN || "❌ NÃO DEFINIDO",
        length: process.env.TRYPLOPAY_TOKEN?.length || 0,
        preview: process.env.TRYPLOPAY_TOKEN ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 15)}...` : "undefined",
      },
      TRYPLOPAY_API_URL: {
        exists: !!process.env.TRYPLOPAY_API_URL,
        value: process.env.TRYPLOPAY_API_URL || "❌ NÃO DEFINIDO",
      },
      TRYPLOPAY_SECRET_KEY: {
        exists: !!process.env.TRYPLOPAY_SECRET_KEY,
        value: process.env.TRYPLOPAY_SECRET_KEY || "❌ NÃO DEFINIDO",
        length: process.env.TRYPLOPAY_SECRET_KEY?.length || 0,
        preview: process.env.TRYPLOPAY_SECRET_KEY
          ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 15)}...`
          : "undefined",
      },
      TRYPLOPAY_WEBHOOK_URL: {
        exists: !!process.env.TRYPLOPAY_WEBHOOK_URL,
        value: process.env.TRYPLOPAY_WEBHOOK_URL || "❌ NÃO DEFINIDO",
      },
    },
    instructions: {
      step1: "Configure as seguintes variáveis de ambiente no Vercel:",
      step2: "TRYPLOPAY_TOKEN=WmCVLneePWrUMgJ",
      step3: "TRYPLOPAY_API_URL=https://api.tryplopay.com",
      step4: "TRYPLOPAY_SECRET_KEY=V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz",
      step5: "TRYPLOPAY_WEBHOOK_URL=https://v0-copy-shein-website.vercel.app/api/tryplopay/webhook",
      step6: "Após configurar, faça um novo deploy ou aguarde alguns minutos",
    },
    ready_for_production: false,
  }

  // Verificar se todas as variáveis estão configuradas
  const allConfigured =
    envStatus.variables.TRYPLOPAY_TOKEN.exists &&
    envStatus.variables.TRYPLOPAY_API_URL.exists &&
    envStatus.variables.TRYPLOPAY_SECRET_KEY.exists &&
    envStatus.variables.TRYPLOPAY_WEBHOOK_URL.exists

  envStatus.ready_for_production = allConfigured

  if (allConfigured) {
    envStatus.message = "✅ Todas as variáveis estão configuradas! PIX real está pronto."
  } else {
    envStatus.message = "❌ Algumas variáveis não estão configuradas. Usando PIX simulado."
  }

  return NextResponse.json(envStatus, { status: 200 })
}

export async function POST() {
  // Endpoint para forçar verificação das variáveis
  const forceCheck = {
    timestamp: new Date().toISOString(),
    forced_check: true,
    current_env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    tryplopay_vars: {
      TRYPLOPAY_TOKEN: process.env.TRYPLOPAY_TOKEN || "undefined",
      TRYPLOPAY_API_URL: process.env.TRYPLOPAY_API_URL || "undefined",
      TRYPLOPAY_SECRET_KEY: process.env.TRYPLOPAY_SECRET_KEY || "undefined",
      TRYPLOPAY_WEBHOOK_URL: process.env.TRYPLOPAY_WEBHOOK_URL || "undefined",
    },
    next_steps: [
      "1. Acesse o painel do Vercel",
      "2. Vá em Settings > Environment Variables",
      "3. Adicione as variáveis fornecidas",
      "4. Faça um novo deploy",
      "5. Teste novamente em /checkout",
    ],
  }

  return NextResponse.json(forceCheck, { status: 200 })
}
