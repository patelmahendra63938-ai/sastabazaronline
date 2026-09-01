export const revalidate = 60;

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShoppingBag, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard, { Product } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';

const SITE_URL = 'https://www.adhyeybrothers.in';
const COLLECTION_URL = `${SITE_URL}/collections/dhoti-choli`;

export const metadata: Metadata = {
  title: 'Women’s Dhoti Choli for Navratri, Garba & Weddings',
  description:
    'Explore women’s Dhoti Choli sets in velvet, Vichitra silk and festive sequin styles for Navratri, Garba, Dandiya, Haldi, weddings and celebrations.',
  alternates: {
    canonical: COLLECTION_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
  openGraph: {
    type: 'website',
    url: COLLECTION_URL,
    siteName: 'ADHYEY BROTHERS',
    title: 'Women’s Dhoti Choli & Navratri Collection | ADHYEY BROTHERS',
    description:
      'Discover elegant Dhoti Choli sets for Navratri, Garba, Dandiya, Haldi, weddings and festive celebrations.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Women’s Dhoti Choli Collection at ADHYEY BROTHERS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Women’s Dhoti Choli & Navratri Collection | ADHYEY BROTHERS',
    description:
      'Shop festive Dhoti Choli styles for Navratri, Garba, Dandiya, Haldi and weddings.',
    images: ['/opengraph-image'],
  },
};

type DhotiCollectionProduct = Product & {
  description?: string | null;
  created_at?: string | null;
};

async function getDhotiCholiProducts(): Promise<DhotiCollectionProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, title, description, price, mrp, category, images, stock, created_at, inventory(size, available_quantity)'
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (error) console.error('Dhoti Choli collection query failed:', error.message);
    return [];
  }

  return (data as DhotiCollectionProduct[]).filter(product => {
    const searchable = `${product.title || ''} ${product.description || ''}`.toLowerCase();
    return searchable.includes('dhoti choli');
  });
}

const occasionCards = [
  {
    title: 'Navratri & Garba',
    text: 'Choose vibrant yellow, mustard and green styles with sequin or embroidered detailing for energetic Garba and Dandiya nights.',
  },
  {
    title: 'Haldi & Mehendi',
    text: 'Warm yellow and mustard Dhoti Choli sets create a bright, comfortable and photo-ready look for daytime pre-wedding functions.',
  },
  {
    title: 'Weddings & Sangeet',
    text: 'Velvet, Vichitra silk and rich embellished styles bring a premium fusion silhouette to wedding celebrations and Sangeet evenings.',
  },
  {
    title: 'Reception & Evening',
    text: 'Wine, black and deeper festive shades offer an elegant statement look for receptions, cocktail evenings and special functions.',
  },
];

const faqs = [
  {
    question: 'What is a Dhoti Choli?',
    answer:
      'A Dhoti Choli is an Indo-Western ethnic outfit that combines a fitted or embellished choli with a draped dhoti-style bottom. Many modern sets also include a shrug, cape or dupatta for a complete festive look.',
  },
  {
    question: 'Is Dhoti Choli suitable for Navratri and Garba?',
    answer:
      'Yes. A ready-to-wear Dhoti Choli offers easy movement and a distinctive festive silhouette, making it a stylish alternative for Navratri, Garba and Dandiya celebrations.',
  },
  {
    question: 'Which colours work best for Haldi and Mehendi?',
    answer:
      'Yellow and mustard are especially popular for Haldi, while green works beautifully for Mehendi. Wine and black are strong choices for evening functions, Sangeet and receptions.',
  },
  {
    question: 'How can I style a Dhoti Choli for a wedding?',
    answer:
      'Pair your Dhoti Choli with statement earrings, bangles or a clutch and metallic heels. Velvet and sequin styles work especially well for wedding and reception dressing.',
  },
  {
    question: 'Is a Dhoti Choli comfortable for dancing?',
    answer:
      'The draped, ready-to-wear bottom is designed to allow comfortable movement, which makes Dhoti Choli sets practical for Garba, Dandiya and Sangeet dancing.',
  },
];

export default async function DhotiCholiCollectionPage() {
  const products = await getDhotiCholiProducts();

  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Women’s Dhoti Choli Collection',
        item: COLLECTION_URL,
      },
    ],
  }).replace(/</g, '\\u003c');

  const itemListJsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Women’s Dhoti Choli & Navratri Collection',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: product.title,
      url: `${SITE_URL}/product/${encodeURIComponent(product.id)}`,
    })),
  }).replace(/</g, '\\u003c');

  return (
    <main className="min-h-screen bg-[#fffaf5] text-stone-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: itemListJsonLd }}
      />

      <Header />

      <div className="mx-auto max-w-7xl px-4 pb-14 pt-5 sm:px-6 sm:pb-20 sm:pt-7">
        <nav aria-label="Breadcrumb" className="mb-4 text-[11px] font-semibold text-stone-500 sm:text-xs">
          <Link href="/" className="transition hover:text-[#741f23]">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-stone-700">Dhoti Choli</span>
        </nav>

        <section className="overflow-hidden rounded-3xl border border-[#ead8b8] bg-[#741f23] px-5 py-8 text-white shadow-sm sm:px-8 sm:py-11 lg:px-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#f0c987] sm:text-xs">
              <Sparkles size={14} aria-hidden="true" />
              Festive Collection
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Women’s Dhoti Choli & Navratri Collection
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#f8e8ce] sm:text-base sm:leading-8">
              Discover a modern take on traditional festive dressing with our women’s Dhoti Choli collection. Explore rich velvet, Vichitra silk, sequin detailing, embroidered shrugs and beautifully draped silhouettes created for Navratri, Garba, Dandiya, Haldi, weddings and special celebrations.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold sm:text-xs">
              {['Navratri', 'Garba', 'Dandiya', 'Haldi', 'Wedding', 'Sangeet'].map(label => (
                <span key={label} className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-12" aria-labelledby="collection-products">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Shop the collection</p>
              <h2 id="collection-products" className="mt-1 text-2xl font-black sm:text-3xl">Dhoti Choli Styles</h2>
              <p className="mt-2 text-sm text-stone-600">
                {products.length > 0
                  ? `${products.length} active ${products.length === 1 ? 'style' : 'styles'} available.`
                  : 'Our Dhoti Choli collection is being refreshed.'}
              </p>
            </div>
            <Link href="/category/Women%20Ethnic%20Wear" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#741f23] transition hover:text-[#5e171b]">
              Explore all Women’s Ethnic Wear
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} priorityImage={index < 2} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-[#ead8b8] bg-white px-6 py-12 text-center shadow-xs">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#fff7e8] text-[#741f23]">
                <ShoppingBag size={24} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-black">New festive styles are coming soon</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                Browse our Women’s Ethnic Wear collection while we refresh this dedicated Dhoti Choli selection.
              </p>
              <Link href="/category/Women%20Ethnic%20Wear" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#741f23] px-5 text-xs font-bold text-white transition hover:bg-[#5e171b]">
                Browse Women’s Ethnic Wear
              </Link>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[#ead8b8] bg-white p-5 shadow-xs sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Modern festive dressing</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Why Choose a Dhoti Choli?</h2>
              <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">
                A Dhoti Choli combines the elegance of Indian festive wear with the ease of a ready-to-wear draped silhouette. Compared with a traditional lehenga, the dhoti-style bottom offers a distinctive fusion look and comfortable movement, while embroidered cholis, sequins, capes and shrugs add a polished designer finish.
              </p>
              <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">
                It is an especially versatile choice for women who want one outfit that can move from Garba and Dandiya nights to Haldi, Sangeet, weddings and receptions with a simple change of jewellery and accessories.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                'Ready-to-wear draped styling',
                'Comfortable movement for Garba and Sangeet',
                'Velvet, Vichitra silk and sequin options',
                'Festive colours for daytime and evening events',
              ].map(item => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[#f0e1c8] bg-[#fffaf5] p-4">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#741f23]" size={18} aria-hidden="true" />
                  <p className="text-sm font-semibold leading-6 text-stone-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-12" aria-labelledby="shop-by-occasion">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Style inspiration</p>
            <h2 id="shop-by-occasion" className="mt-2 text-2xl font-black sm:text-3xl">Shop the Look by Occasion</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {occasionCards.map(card => (
              <article key={card.title} className="rounded-2xl border border-[#ead8b8] bg-white p-5 shadow-xs">
                <h3 className="text-base font-black text-[#741f23]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#ead8b8] bg-[#fff7e8] p-5 sm:p-8 lg:p-10" aria-labelledby="dhoti-faqs">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Helpful answers</p>
            <h2 id="dhoti-faqs" className="mt-2 text-2xl font-black sm:text-3xl">Dhoti Choli FAQs</h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {faqs.map(faq => (
              <article key={faq.question} className="rounded-2xl border border-[#ead8b8] bg-white p-5">
                <h3 className="text-sm font-black text-stone-900 sm:text-base">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
