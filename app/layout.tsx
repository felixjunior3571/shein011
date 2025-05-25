import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Footer } from "@/components/footer"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Cartão SHEIN - Solicite em menos de 5 minutos",
  description:
    "Solicite seu cartão SHEIN em menos de 5 minutos, sem consulta ao SPC/Serasa. Aprovação garantida e benefícios exclusivos.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
        <Footer />
      </body>
    </html>
  )
}
