import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from './providers'

export const viewport: Viewport = {
  themeColor:   '#0f2040',
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title:       'Crater SDA Welfare Society',
  description: 'Member welfare management — contributions, claims, loans and benefits for Crater SDA Church, Nakuru.',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'Crater Welfare',
    startupImage:   '/icons/apple-touch-icon.png',
  },
  icons: {
    icon: [
      { url: '/icons/icon-96.png',  sizes: '96x96',   type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple:    '/icons/apple-touch-icon.png',
    shortcut: '/icons/icon-192.png',
  },
  other: {
    'mobile-web-app-capable':  'yes',
    'msapplication-TileColor': '#0f2040',
    'msapplication-TileImage': '/icons/icon-144.png',
    'application-name':        'Crater Welfare',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — must stay here; cannot be expressed via `metadata` */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>

        {/* ── Service Worker registration ──────────────────────────────────
             Registers sw.js only in production (not during Next.js dev).
             In dev, the SW is intentionally skipped to prevent it from
             intercepting Turbopack HMR requests and causing reload loops. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && location.hostname !== 'localhost' && !location.hostname.startsWith('127.')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(reg) {
                      console.log('SW registered:', reg.scope);
                      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                      reg.addEventListener('updatefound', function() {
                        var newSW = reg.installing;
                        if (newSW) {
                          newSW.addEventListener('statechange', function() {
                            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                              newSW.postMessage({ type: 'SKIP_WAITING' });
                            }
                          });
                        }
                      });
                    })
                    .catch(function(err) { console.warn('SW registration failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
