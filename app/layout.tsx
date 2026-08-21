import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://sastabazaronline.in'),
  title: {
    default: 'SASTABAZARONLINE – Wholesale Home & Kitchen Items Online',
    template: '%s | SASTABAZARONLINE',
  },
  description: 'Shop home, kitchen, lifestyle, fashion and other consumer products online from SASTABAZARONLINE, owned and operated by ADHYEY BROTHERS.',
  keywords: ['online shopping India', 'home products', 'kitchen products', 'SASTABAZARONLINE', 'ADHYEY BROTHERS'],
  openGraph: {
    title: 'SASTABAZARONLINE – Wholesale Home & Kitchen Items Online',
    description: 'Direct factory-rate home and kitchen products delivered across India.',
    url: 'https://sastabazaronline.in',
    siteName: 'SASTABAZARONLINE',
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
        className={`${inter.className} bg-[#F8F9FB] text-gray-900 antialiased min-h-screen flex flex-col selection:bg-orange-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
