export const revalidate = 60;

import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard, { Product } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';

const SITE_URL = 'https://www.adhyeybrothers.in';
const COLLECTION_URL = `${SITE_URL}/collections/lehenga-choli`;

export const metadata: Metadata = {
  title: 'Lehenga Choli for Women | Ready to Wear Festive Styles',
  description: 'Shop Lehenga Choli for women at ADHYEY BROTHERS. Explore ready-to-wear, embellished and sequinned festive styles for weddings, Navratri, Garba and Sangeet.',
  alternates: { canonical: COLLECTION_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    type: 'website', url: COLLECTION_URL, siteName: 'ADHYEY BROTHERS',
    title: 'Lehenga Choli for Women | ADHYEY BROTHERS',
    description: 'Discover ready-to-wear Lehenga Choli styles for weddings, Navratri, Garba and festive celebrations.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Lehenga Choli for Women at ADHYEY BROTHERS' }],
  },
};

type CollectionProduct = Product & { description?: string | null; created_at?: string | null };

async function getProducts(): Promise<CollectionProduct[]> {
  const { data, error } = await supabase.from('products')
    .select('id, title, description, price, mrp, category, images, stock, created_at, inventory(size, available_quantity)')
    .eq('is_active', true).order('created_at', { ascending: false });
  if (error || !data) {
    if (error) console.error('Lehenga Choli collection query failed:', error.message);
    return [];
  }
  return (data as CollectionProduct[]).filter(product => {
    const text = `${product.title || ''} ${product.description || ''}`.toLowerCase();
    return text.includes('lehenga') || text.includes('ghagra') || text.includes('ghaghra');
  });
}

export default async function LehengaCholiCollectionPage() {
  const products = await getProducts();
  const breadcrumbJsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Lehenga Choli', item: COLLECTION_URL },
    ],
  }).replace(/</g, '\\u003c');
  const itemListJsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList', name: 'Lehenga Choli for Women',
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem', position: index + 1, name: product.title,
      url: `${SITE_URL}/product/${encodeURIComponent(product.id)}`,
    })),
  }).replace(/</g, '\\u003c');

  return (
    <main className="min-h-screen bg-[#fffaf5] text-stone-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      {products.length > 0 ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: itemListJsonLd }} /> : null}
      <Header />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs font-semibold text-stone-500">
          <Link href="/">Home</Link><span className="mx-2">/</span><span>Lehenga Choli</span>
        </nav>
        <section className="rounded-3xl border border-[#ead8b8] bg-[#741f23] px-5 py-9 text-white shadow-sm sm:px-9 lg:px-12">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f0c987]">ADHYEY BROTHERS Festive Collection</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl lg:text-5xl">Lehenga Choli for Women</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#f8e8ce] sm:text-base">
            Explore ready-to-wear Lehenga Choli styles with embellished and sequinned details for weddings, Navratri, Garba, Sangeet, Haldi and festive celebrations.
          </p>
        </section>
        <section className="py-10" aria-labelledby="lehenga-products">
          <h2 id="lehenga-products" className="text-2xl font-black sm:text-3xl">Shop Lehenga Choli Online</h2>
          <p className="mt-2 text-sm text-stone-600">{products.length} active {products.length === 1 ? 'style' : 'styles'} available.</p>
          {products.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((product, index) => <ProductCard key={product.id} product={product} priorityImage={index < 2} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-[#ead8b8] bg-white p-8 text-center">
              <p className="font-bold">New Lehenga Choli styles are being added.</p>
              <Link href="/category/Women%20Ethnic%20Wear" className="mt-4 inline-block text-sm font-bold text-[#741f23]">Browse Women’s Ethnic Wear</Link>
            </div>
          )}
        </section>
        <section className="rounded-3xl border border-[#ead8b8] bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-black">Ready-to-Wear Lehenga Choli for Festive Occasions</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-stone-600">
            ADHYEY BROTHERS offers women’s festive ethnic wear for weddings, Sangeet, Navratri, Garba and family celebrations. Browse embellished, sequinned and ready-to-wear Lehenga Choli styles, then check each product page for current sizes, fabric details, price and availability.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/collections/dhoti-choli" className="rounded-xl border border-[#ead8b8] px-4 py-2 text-xs font-bold text-[#741f23]">Explore Dhoti Choli</Link>
            <Link href="/category/Women%20Ethnic%20Wear" className="rounded-xl bg-[#741f23] px-4 py-2 text-xs font-bold text-white">All Women’s Ethnic Wear</Link>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
}
