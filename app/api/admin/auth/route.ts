import { NextResponse } from "next/server"

// Credenciais de administrador
const ADMIN_USERNAME = "felix"
const ADMIN_PASSWORD = "freegels1"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Verificar credenciais
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Gerar token simples (base64 encoded timestamp + username)
      const token = Buffer.from(`${username}:${Date.now()}`).toString("base64")

      return NextResponse.json({ success: true, token })
    } else {
      return NextResponse.json({ success: false, message: "Usuário ou senha incorretos" }, { status: 401 })
    }
  } catch (error) {
    console.error("Erro na autenticação:", error)
    return NextResponse.json({ success: false, message: "Erro interno do servidor" }, { status: 500 })
  }
}
