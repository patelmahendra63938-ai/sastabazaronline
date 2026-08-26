import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import GA4EcommerceTracker from '@/components/GA4EcommerceTracker';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#741f23',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://www.adhyeybrothers.in'),

  title: {
    default: 'ADHYEY BROTHERS – Online Shopping for Fashion, Home & More',
    template: '%s | ADHYEY BROTHERS',
  },

  description:
    'Shop fashion, home, kitchen and lifestyle products online from ADHYEY BROTHERS, Surat, Gujarat. Quality products delivered across India.',

  keywords: [
    'ADHYEY BROTHERS',
    'online shopping India',
    'fashion online',
    'home and kitchen products',
    'Surat online shopping',
  ],

  openGraph: {
    title: 'ADHYEY BROTHERS – Online Shopping for Fashion, Home & More',
    description:
      'Shop fashion, home, kitchen and lifestyle products online from ADHYEY BROTHERS.',
    url: 'https://www.adhyeybrothers.in',
    siteName: 'ADHYEY BROTHERS',
    locale: 'en_IN',
    type: 'website',
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.className} bg-[#fffaf5] text-gray-900 antialiased min-h-screen flex flex-col selection:bg-[#d7aa5b] selection:text-[#5e171b]`}
      >
        {children}

        <GA4EcommerceTracker />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-KYE1SBDLCY"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-KYE1SBDLCY');
          `}
        </Script>
      </body>
    </html>
  );
}