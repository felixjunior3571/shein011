import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { useOnlineTracking } from "@/hooks/use-online-tracking"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useOnlineTracking()

  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
