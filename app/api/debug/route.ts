import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    tryplopay: {
      TRYPLOPAY_TOKEN: process.env.TRYPLOPAY_TOKEN
        ? `${process.env.TRYPLOPAY_TOKEN.substring(0, 10)}...`
        : "❌ NÃO DEFINIDO",
      TRYPLOPAY_API_URL: process.env.TRYPLOPAY_API_URL || "❌ NÃO DEFINIDO",
      TRYPLOPAY_WEBHOOK_URL: process.env.TRYPLOPAY_WEBHOOK_URL || "❌ NÃO DEFINIDO",
      TRYPLOPAY_SECRET_KEY: process.env.TRYPLOPAY_SECRET_KEY
        ? `${process.env.TRYPLOPAY_SECRET_KEY.substring(0, 10)}...`
        : "❌ NÃO DEFINIDO",
    },
    headers: Object.fromEntries(request.headers),
    url: request.url,
    method: request.method,
  }

  return NextResponse.json(debugInfo, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const debugInfo = {
      timestamp: new Date().toISOString(),
      received_data: body,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      tryplopay_config: {
        token_exists: !!process.env.TRYPLOPAY_TOKEN,
        api_url_exists: !!process.env.TRYPLOPAY_API_URL,
        webhook_url_exists: !!process.env.TRYPLOPAY_WEBHOOK_URL,
      },
      request_info: {
        headers: Object.fromEntries(request.headers),
        url: request.url,
        method: request.method,
      },
    }

    return NextResponse.json({
      success: true,
      message: "Debug endpoint funcionando",
      debug: debugInfo,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    )
  }
}
