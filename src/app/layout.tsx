import type { Metadata, Viewport } from 'next';
import { Cairo, Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';
import { BRAND } from '@/lib/brand';

const arabic = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const latin = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${BRAND.fullName}`,
    template: `%s · ${BRAND.name}`,
  },
  description: `${BRAND.fullName} — نظام إدارة موارد متكامل لتجميع الحليب الخام من الفلاحين، تخزينه مركزياً، وبيعه بالجملة للمصانع والعملاء، مع محرّك محاسبي مزدوج القيد وتقارير PDF رسمية.`,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.fullName }],
  icons: {
    icon: [{ url: '/turki-logo.png', type: 'image/png' }],
    apple: [{ url: '/turki-logo.png' }],
    shortcut: '/turki-logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ar_LY',
    title: BRAND.fullName,
    description: BRAND.tagline,
    siteName: BRAND.name,
    images: [{ url: '/turki-logo.png', width: 1024, height: 1000, alt: BRAND.fullName }],
  },
};

export const viewport: Viewport = {
  themeColor: '#171717',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${arabic.variable} ${latin.variable} ${serif.variable} ${mono.variable}`}
    >
      <body
        className="min-h-[100dvh] bg-background font-sans text-foreground"
        suppressHydrationWarning
        data-grammarly-disable="true"
      >
        <Providers>{children}</Providers>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
