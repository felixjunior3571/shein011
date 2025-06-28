import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { OptimizedSocialNotifications } from "@/components/optimized-social-notifications"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SHEIN Card - Cartão de Crédito com Benefícios Exclusivos",
  description:
    "Solicite seu Cartão SHEIN com cashback, parcelamento sem juros e benefícios exclusivos. Aprovação rápida e uso imediato.",
  keywords: "cartão de crédito, SHEIN, cashback, parcelamento sem juros, cartão virtual",
  authors: [{ name: "SHEIN Card" }],
  openGraph: {
    title: "SHEIN Card - Cartão de Crédito com Benefícios Exclusivos",
    description: "Solicite seu Cartão SHEIN com cashback, parcelamento sem juros e benefícios exclusivos.",
    type: "website",
    locale: "pt_BR",
  },
  robots: {
    index: true,
    follow: true,
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
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://utmify.com.br" />

        {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX', {
                page_title: document.title,
                page_location: window.location.href,
                send_page_view: false // We'll send manually with optimization
              });
            `,
          }}
        />

        {/* UTMify Script - Optimized */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Check if UTMify is already initialized
                if (window.utmifyInitialized) {
                  console.log('🔄 UTMify already initialized, skipping...');
                  return;
                }

                try {
                  console.log('🚀 Initializing UTMify...');
                  
                  // Mark as initialized
                  window.utmifyInitialized = true;
                  
                  // UTMify configuration
                  window.utmify = window.utmify || {};
                  window.utmify.config = {
                    domain: window.location.hostname,
                    debug: ${process.env.NODE_ENV === "development"},
                    batchEvents: true,
                    batchSize: 5,
                    batchTimeout: 2000,
                    respectDoNotTrack: true,
                  };

                  // Load UTMify script
                  var script = document.createElement('script');
                  script.async = true;
                  script.src = 'https://utmify.com.br/scripts/utmify.js';
                  script.onload = function() {
                    console.log('✅ UTMify loaded successfully');
                    
                    // Initialize with optimized settings
                    if (window.utmify && window.utmify.init) {
                      window.utmify.init({
                        trackPageViews: false, // We'll handle manually
                        trackClicks: true,
                        trackForms: true,
                        respectPrivacy: true,
                      });
                    }
                  };
                  script.onerror = function() {
                    console.error('❌ Failed to load UTMify script');
                    window.utmifyInitialized = false;
                  };
                  
                  document.head.appendChild(script);
                  
                } catch (error) {
                  console.error('❌ UTMify initialization error:', error);
                  window.utmifyInitialized = false;
                }
              })();
            `,
          }}
        />

        {/* Meta Pixel - Optimized */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (window.fbqInitialized) return;
                
                try {
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');

                  fbq('init', 'YOUR_PIXEL_ID');
                  fbq('track', 'PageView');
                  
                  window.fbqInitialized = true;
                  console.log('✅ Meta Pixel initialized');
                } catch (error) {
                  console.error('❌ Meta Pixel error:', error);
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
          intervalRange={[20000, 35000]}
          enableDebug={process.env.NODE_ENV === "development"}
        />
      </body>
    </html>
  )
}
