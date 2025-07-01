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
        {/* UTMify Scripts - Rastreamento completo do funil */}
        <script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
          async
          defer
        ></script>
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

        {/* UTMify Helper Functions para rastreamento do funil */}
        <Script id="utmify-funnel-tracking" strategy="afterInteractive">
          {`
            // Função global para rastrear eventos do funil
            window.trackUTMifyFunnel = function(event, data) {
              try {
                if (window.utmify && typeof window.utmify.track === 'function') {
                  window.utmify.track(event, {
                    ...data,
                    funnel: 'shein_card',
                    timestamp: new Date().toISOString(),
                    page: window.location.pathname,
                    url: window.location.href
                  });
                  console.log('✅ UTMify Funil tracked:', event, data);
                } else {
                  console.log('⚠️ UTMify não disponível, evento salvo:', event, data);
                  // Salva eventos para quando UTMify carregar
                  window.utmifyQueue = window.utmifyQueue || [];
                  window.utmifyQueue.push({ event, data });
                }
              } catch (error) {
                console.error('❌ Erro no rastreamento UTMify:', error);
              }
            };

            // Processa eventos salvos quando UTMify carrega
            window.addEventListener('load', function() {
              setTimeout(function() {
                if (window.utmifyQueue && window.utmify) {
                  console.log('🔄 Processando eventos salvos do UTMify...');
                  window.utmifyQueue.forEach(function(item) {
                    window.trackUTMifyFunnel(item.event, item.data);
                  });
                  window.utmifyQueue = [];
                }
                
                // Auto-track page view
                window.trackUTMifyFunnel('page_view', {
                  step: window.location.pathname.replace('/', '') || 'home'
                });
              }, 1000);
            });

            // Função de teste
            window.testUTMify = function() {
              console.log("🧪 Testando UTMify...");
              if (typeof window.utmify !== 'undefined' && window.utmify.track) {
                console.log("✅ UTMify está funcionando!");
                window.trackUTMifyFunnel('test_event', { test: true });
                return true;
              } else {
                console.warn("❌ UTMify não está disponível");
                return false;
              }
            };
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
