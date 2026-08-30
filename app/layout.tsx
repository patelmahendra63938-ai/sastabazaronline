import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import GA4EcommerceTracker from '@/components/GA4EcommerceTracker';
import Welcome50Promotion from '@/components/promotions/Welcome50Promotion';
import RetailQuantityGuard from '@/components/commerce/RetailQuantityGuard';
import WhatsAppHelpButton from '@/components/WhatsAppHelpButton';

const SITE_URL = 'https://www.adhyeybrothers.in';
const SITE_NAME = 'ADHYEY BROTHERS';
const DEFAULT_TITLE = 'Women’s Ethnic Wear, Girls Fashion & Online Shopping | ADHYEY BROTHERS';
const DEFAULT_DESCRIPTION =
  'Shop women’s ethnic wear, Dhoti Choli, Lehenga Choli, festive styles and girls fashion online at ADHYEY BROTHERS. Pan India delivery from Surat, Gujarat.';

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
  metadataBase: new URL(SITE_URL),

  title: {
    default: DEFAULT_TITLE,
    template: '%s | ADHYEY BROTHERS',
  },

  description: DEFAULT_DESCRIPTION,

  applicationName: SITE_NAME,

  keywords: [
    'ADHYEY BROTHERS',
    'women ethnic wear online India',
    'dhoti choli for women',
    'lehenga choli online',
    'girls nightwear online',
    'festive wear women India',
    'Surat fashion online',
  ],

  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'ADHYEY BROTHERS online fashion store',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ['/opengraph-image'],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    email: 'mailto:adhyeybrothers@gmail.com',
    telephone: '+91-9723268666',
    taxID: '24AKBPD1704F1Z1',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '3rd Floor, 33 Shaktinagar Society, Peoples Char Rasta, Katargam',
      addressLocality: 'Surat',
      addressRegion: 'Gujarat',
      postalCode: '395004',
      addressCountry: 'IN',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+91-9723268666',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi', 'Gujarati'],
      },
      {
        '@type': 'ContactPoint',
        telephone: '+91-9879331036',
        contactType: 'grievance officer',
        areaServed: 'IN',
      },
    ],
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    inLanguage: 'en-IN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJson = JSON.stringify(organizationJsonLd).replace(/</g, '\u003c');
  const websiteJson = JSON.stringify(websiteJsonLd).replace(/</g, '\u003c');

  return (
    <html lang="en-IN" className="scroll-smooth">
      <body
        className={`${inter.className} bg-[#fffaf5] text-gray-900 antialiased min-h-screen flex flex-col selection:bg-[#d7aa5b] selection:text-[#5e171b]`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: organizationJson }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJson }}
        />

        <RetailQuantityGuard />
        <Welcome50Promotion />
        {children}
        <WhatsAppHelpButton />

        <GA4EcommerceTracker />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VSXDLN7MH5"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', 'G-VSXDLN7MH5');
          `}
        </Script>
      </body>
    </html>
  );
}
