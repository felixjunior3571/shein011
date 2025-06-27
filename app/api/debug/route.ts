import { NextResponse } from "next/server"

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
    tryplopayConfig: {
      apiUrl: "https://api.tryplopay.com",
      tokenLength: "WmCVLneePWrUMgJ".length,
      secretKeyLength: "V21DVkxuZWVQV3JVTWdKOjoxNzQ2MDUxMjIz".length,
    },
    webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/api/tryplopay/webhook`,
  }

  return NextResponse.json(debugInfo)
}
