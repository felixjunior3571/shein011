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

        {/* UTMify Pixel - Script Principal */}
        <script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck="true"
          data-utmify-prevent-subids="true"
          async
          defer
        />

        {/* UTMify Pixel - Configuração do Pixel ID */}
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

        {/* UTMify - Inicialização e Tracking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Aguardar carregamento do UTMify
              window.addEventListener('load', function() {
                // Verificar se UTMify foi carregado
                if (typeof window.utmify !== 'undefined') {
                  console.log('✅ UTMify carregado com sucesso');
                  
                  // Rastrear pageview inicial
                  if (window.utmify.pageview) {
                    window.utmify.pageview();
                  }
                  
                  // Rastrear evento de carregamento da página
                  if (window.utmify.track) {
                    window.utmify.track('page_load', {
                      page: window.location.pathname,
                      url: window.location.href,
                      timestamp: new Date().toISOString()
                    });
                  }
                } else {
                  console.warn('⚠️ UTMify não foi carregado');
                }
              });

              // Função helper para tracking
              window.trackUTMify = function(event, data) {
                try {
                  if (typeof window.utmify !== 'undefined' && window.utmify.track) {
                    window.utmify.track(event, data || {});
                    console.log('📊 UTMify Track:', event, data);
                  } else {
                    console.warn('UTMify não disponível para tracking:', event);
                  }
                } catch (error) {
                  console.error('Erro no tracking UTMify:', error);
                }
              };

              // Rastrear cliques em botões importantes
              document.addEventListener('DOMContentLoaded', function() {
                // Rastrear cliques em botões de CTA
                document.addEventListener('click', function(e) {
                  const target = e.target;
                  
                  // Botões de "Solicitar Cartão", "Continuar", etc.
                  if (target.matches('button, a[href*="form"], a[href*="quiz"], .cta-button')) {
                    const buttonText = target.textContent || target.innerText || 'button_click';
                    window.trackUTMify('button_click', {
                      button_text: buttonText.trim(),
                      page: window.location.pathname,
                      element_type: target.tagName.toLowerCase()
                    });
                  }
                  
                  // Rastrear cliques em links externos
                  if (target.matches('a[href^="http"]') && !target.href.includes(window.location.hostname)) {
                    window.trackUTMify('external_link_click', {
                      url: target.href,
                      text: target.textContent || target.innerText
                    });
                  }
                });
              });
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
