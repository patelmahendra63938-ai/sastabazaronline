import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import GA4EcommerceTracker from '@/components/GA4EcommerceTracker';

const SITE_URL = 'https://www.adhyeybrothers.in';

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
    default:
      'ADHYEY BROTHERS – Online Shopping for Fashion, Home & More',
    template:
      '%s | ADHYEY BROTHERS',
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
    title:
      'ADHYEY BROTHERS – Online Shopping for Fashion, Home & More',

    description:
      'Shop fashion, home, kitchen and lifestyle products online from ADHYEY BROTHERS.',

    url:
      SITE_URL,

    siteName:
      'ADHYEY BROTHERS',

    locale:
      'en_IN',

    type:
      'website',
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
  const organizationJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'Organization',

    '@id':
      `${SITE_URL}/#organization`,

    name:
      'ADHYEY BROTHERS',

    url:
      SITE_URL,

    email:
      'mailto:adhyeybrothers@gmail.com',

    telephone:
      '+91-9723268666',

    taxID:
      '24AKBPD1704F1Z1',

    address: {
      '@type':
        'PostalAddress',

      streetAddress:
        '3rd Floor, 33 Shaktinagar Society, Peoples Char Rasta, Katargam',

      addressLocality:
        'Surat',

      addressRegion:
        'Gujarat',

      postalCode:
        '395004',

      addressCountry:
        'IN',
    },

    contactPoint: [
      {
        '@type':
          'ContactPoint',

        telephone:
          '+91-9723268666',

        contactType:
          'customer service',

        areaServed:
          'IN',

        availableLanguage: [
          'English',
          'Hindi',
          'Gujarati',
        ],
      },
      {
        '@type':
          'ContactPoint',

        telephone:
          '+91-9879331036',

        contactType:
          'grievance officer',

        areaServed:
          'IN',
      },
    ],
  };

  const websiteJsonLd = {
    '@context':
      'https://schema.org',

    '@type':
      'WebSite',

    '@id':
      `${SITE_URL}/#website`,

    url:
      SITE_URL,

    name:
      'ADHYEY BROTHERS',

    publisher: {
      '@id':
        `${SITE_URL}/#organization`,
    },

    inLanguage:
      'en-IN',
  };

  const organizationJson =
    JSON.stringify(
      organizationJsonLd
    ).replace(
      /</g,
      '\\u003c'
    );

  const websiteJson =
    JSON.stringify(
      websiteJsonLd
    ).replace(
      /</g,
      '\\u003c'
    );

  return (
    <html
      lang="en"
      className="scroll-smooth"
    >
      <body
        className={`${inter.className} bg-[#fffaf5] text-gray-900 antialiased min-h-screen flex flex-col selection:bg-[#d7aa5b] selection:text-[#5e171b]`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              organizationJson,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html:
              websiteJson,
          }}
        />

        {children}

        <GA4EcommerceTracker />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-KYE1SBDLCY"
          strategy="afterInteractive"
        />

        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
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