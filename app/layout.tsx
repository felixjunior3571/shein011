import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import OptimizedSocialNotifications from "@/components/optimized-social-notifications"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SHEIN Card - Cartão de Crédito com Cashback",
  description: "Solicite seu Cartão SHEIN com cashback exclusivo e parcelamento sem juros",
  keywords: "cartão de crédito, cashback, SHEIN, parcelamento sem juros",
  openGraph: {
    title: "SHEIN Card - Cartão de Crédito com Cashback",
    description: "Solicite seu Cartão SHEIN com cashback exclusivo e parcelamento sem juros",
    type: "website",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* UTMify Script - Configuração Oficial */}
        <script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck="true"
          data-utmify-prevent-subids="true"
          async
          defer
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.pixelId = "6836abf356b3052677c77248";
              var a = document.createElement("script");
              a.setAttribute("async", "");
              a.setAttribute("defer", "");
              a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
              document.head.appendChild(a);
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <OptimizedSocialNotifications
          maxNotifications={8}
          displayDuration={4000}
          intervalRange={[15000, 25000]}
          enableInActiveTab={false}
        />
      </body>
    </html>
  )
}
