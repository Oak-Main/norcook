import type { Metadata, Viewport } from 'next'
import { ConsentProvider } from '@/components/analytics/consent-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'
import './cook.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Norway Through Food`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Norway Through Food`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/images/hero-fjord.webp',
        width: 1600,
        height: 1067,
        alt: 'A Norwegian fjord at golden hour',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Norway Through Food`,
    description: SITE_DESCRIPTION,
    images: ['/images/hero-fjord.webp'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5f0' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1622' },
  ],
}

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('nordisk-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="bg-background"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ConsentProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ConsentProvider>
      </body>
    </html>
  )
}
