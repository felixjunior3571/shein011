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

        {/* UTMify Script - Optimized */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (window.pixelId) {
                  console.log('UTMify already initialized');
                  return;
                }
                
                try {
                  window.pixelId = 'your-pixel-id';
                  
                  // Initialize UTMify with error handling
                  if (typeof window !== 'undefined') {
                    window.utmify = {
                      track: function(event, data) {
                        try {
                          console.log('UTMify track:', event, data);
                          // Your UTMify tracking logic here
                        } catch (error) {
                          console.warn('UTMify tracking error:', error);
                        }
                      }
                    };
                    
                    console.log('UTMify initialized successfully');
                  }
                } catch (error) {
                  console.warn('UTMify initialization error:', error);
                }
              })();
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
