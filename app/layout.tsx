import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Image from "next/image"
import Script from "next/script"
import "./globals.css"
import { SocialNotifications } from "@/components/social-notifications"

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
      <head>
        {/* Scripts da Utmify com tratamento de erro */}
        <Script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
          strategy="afterInteractive"
          onError={(e) => {
            console.warn("Erro ao carregar script Utmify UTMs:", e)
          }}
        />
        <Script id="utmify-pixel" strategy="afterInteractive">
          {`
            try {
              window.pixelId = "6836abf356b3052677c77248";
              var a = document.createElement("script");
              a.setAttribute("async", "");
              a.setAttribute("defer", "");
              a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
              a.onerror = function() {
                console.warn("Erro ao carregar pixel Utmify");
              };
              document.head.appendChild(a);
            } catch (error) {
              console.warn("Erro ao inicializar Utmify:", error);
            }
          `}
        </Script>
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        {/* Header fixo no topo com logo */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white py-4 border-b shadow-sm">
          <div className="flex justify-center">
            <div className="relative w-[140px] h-[45px] sm:w-[160px] sm:h-[50px] md:w-[180px] md:h-[55px]">
              <Image
                src="/shein-header-logo.png"
                alt="SHEIN"
                fill
                style={{ objectFit: "contain" }}
                priority
                quality={100}
                sizes="(max-width: 640px) 140px, (max-width: 768px) 160px, 180px"
                className="select-none"
                onError={(e) => {
                  console.warn("Erro ao carregar logo do header")
                  // Fallback para texto se a imagem falhar
                  e.currentTarget.style.display = "none"
                }}
              />
            </div>
          </div>
        </header>

        {/* Conteúdo principal com espaçamento para header e footer */}
        <main className="flex-1 pt-20 pb-16">{children}</main>

        {/* Footer fixo na parte inferior */}
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gray-100 py-3 text-center text-gray-600 text-sm border-t">
          <div className="container mx-auto px-4">Copyright © 2025 Shein. Todos os direitos reservados.</div>
        </footer>

        {/* Notificações sociais */}
        <SocialNotifications />
      </body>
    </html>
  )
}
