import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Como obter um token válido da TryploPay",
    steps: [
      "1. Acesse https://dashboard.tryplopay.com",
      "2. Faça login na sua conta",
      "3. Vá em 'API' ou 'Integrações'",
      "4. Gere um novo token de API",
      "5. Copie o token completo",
      "6. Atualize no Vercel Dashboard",
    ],
    currentToken: {
      exists: !!process.env.TRYPLOPAY_TOKEN,
      length: process.env.TRYPLOPAY_TOKEN?.length || 0,
      preview: process.env.TRYPLOPAY_TOKEN
        ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 5)}...${process.env.TRYPLOPAY_TOKEN.substring(-3)}`
        : "undefined",
      status: "INVALID_OR_EXPIRED",
    },
    testEndpoint: "/api/tryplopay/auth-test",
    fallbackMode: "PIX_SIMULADO_ATIVO",
    note: "O sistema está funcionando com PIX simulado enquanto o token não for corrigido",
  })
}
