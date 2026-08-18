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
  description: 'Buy premium home, kitchen, and fashion items at unbeatable wholesale prices online. Managed by Adhyey Brothers from Surat, Gujarat.',
  keywords: ['wholesale kitchenware', 'home utility', 'Surat wholesale market', 'SASTABAZARONLINE', 'Adhyey Brothers'],
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

        {/* 🌐 Google Translate Integration for Indian Regional Languages */}
        <div id="google_translate_element" style={{ display: 'none' }}></div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement({
                  pageLanguage: 'en',
                  includedLanguages: 'en,hi,gu,mr,bn,ta,te,kn,ml,pa,ur,or,as',
                  autoDisplay: false
                }, 'google_translate_element');
              }
            `,
          }}
        />
        <script src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit" async></script>
      </body>
    </html>
  );
}