import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SHEIN Card - Cartão de Crédito Digital",
  description: "Solicite seu cartão SHEIN e tenha acesso a benefícios exclusivos, cashback e parcelamento sem juros.",
  keywords: "cartão de crédito, SHEIN, cartão digital, cashback, parcelamento sem juros",
  authors: [{ name: "SHEIN" }],
  robots: "index, follow",
  openGraph: {
    title: "SHEIN Card - Cartão de Crédito Digital",
    description: "Solicite seu cartão SHEIN e tenha acesso a benefícios exclusivos, cashback e parcelamento sem juros.",
    type: "website",
    locale: "pt_BR",
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
        {/* UTMify Scripts */}
        <Script
          src="https://cdn.utmify.com.br/scripts/utms/latest.js"
          data-utmify-prevent-xcod-sck=""
          data-utmify-prevent-subids=""
          async
          defer
        />
        <Script id="utmify-pixel" strategy="afterInteractive">
          {`
            window.pixelId = "6836abf356b3052677c77248";
            var a = document.createElement("script");
            a.setAttribute("async", "");
            a.setAttribute("defer", "");
            a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js");
            document.head.appendChild(a);
          `}
        </Script>

        {/* UTMify Tracking Helper */}
        <Script id="utmify-tracking" strategy="afterInteractive">
          {`
            window.trackUTMify = function(event, data) {
              try {
                if (window.utmify && typeof window.utmify.track === 'function') {
                  window.utmify.track(event, data);
                  console.log('✅ UTMify tracked:', event, data);
                } else {
                  console.log('⚠️ UTMify not ready, queuing event:', event, data);
                  window.utmifyQueue = window.utmifyQueue || [];
                  window.utmifyQueue.push({ event, data });
                }
              } catch (error) {
                console.error('❌ UTMify tracking error:', error);
              }
            };

            // Process queued events when UTMify loads
            window.addEventListener('load', function() {
              setTimeout(function() {
                if (window.utmifyQueue && window.utmify) {
                  window.utmifyQueue.forEach(function(item) {
                    window.utmify.track(item.event, item.data);
                  });
                  window.utmifyQueue = [];
                }
              }, 1000);
            });

            // Auto-track page views
            if (typeof window !== 'undefined') {
              window.trackUTMify('page_view', {
                page: window.location.pathname,
                url: window.location.href,
                timestamp: new Date().toISOString()
              });
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
