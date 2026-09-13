import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MeeshoReviewsPreview from '@/components/MeeshoReviewsPreview';
import { resolveStorefrontImageSrc } from '@/lib/storefront-image';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PREVIEW_TITLES: Record<string, string> = {
  '2c17feb3-11c8-406f-96b7-282aeb3935bc': 'Women’s Wine Vichitra Silk Dhoti Choli Set with Floral Sequin Shrug | Wedding & Party Wear',
  'aa35dfa6-5a0c-40cb-8ef1-599062f6c18f': 'Women’s Yellow Vichitra Silk Dhoti Choli Set with Floral Sequin Shrug | Haldi & Festive Wear',
  '2bd24aa8-569f-4c54-9135-d3c2f0dfe154': 'Women’s Wine Purple Velvet Dhoti Choli Set with Vichitra Sequin Dupatta | Festive Wedding Wear',
  '87d20840-ef01-4170-be4a-86336f7d258f': 'Women’s Green Velvet Dhoti Choli Set with Embroidered Sequin Shrug | Navratri & Wedding Wear',
};

async function getProduct(productId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from('products')
    .select('id,title,description,price,mrp,images,category,is_active')
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Meesho review preview product fetch failed:', {
      productId,
      message: error.message,
      code: error.code,
    });
    return null;
  }

  return data;
}

export default async function MeeshoReviewsPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  const previewTitle = PREVIEW_TITLES[id];

  if (!product && !previewTitle) {
    return (
      <main className="min-h-screen bg-[#fffaf5]">
        <Header />
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-2xl font-black text-[#741f23]">Preview product not found</h1>
          <p className="mt-3 text-sm text-gray-600">Choose one of the configured products for the Meesho review preview.</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-[#741f23] px-5 py-3 text-sm font-bold text-white">Back to store</Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-9">
        <div className="mb-5 rounded-2xl border border-[#ead8b8] bg-[#fff7e8] px-4 py-3 text-xs font-bold text-[#741f23]">
          Preview environment only — this page is for checking the proposed Meesho reviews design before production.
        </div>

        {product ? (
          <ProductPreview product={product} />
        ) : (
          <div className="rounded-3xl border border-[#ead8b8] bg-white p-6 shadow-xs sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b5843d]">Meesho reviews preview</p>
            <h1 className="mt-2 max-w-4xl text-2xl font-black leading-tight text-gray-900 sm:text-3xl">{previewTitle}</h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              The preview database lookup is temporarily unavailable, but the configured product and Meesho review design can still be checked below. Production is not affected.
            </p>
            <Link href={`/product/${id}`} className="mt-5 inline-flex text-xs font-black text-[#741f23] underline underline-offset-4">
              Open current live product page
            </Link>
          </div>
        )}

        <MeeshoReviewsPreview productId={id} />
      </div>
      <Footer />
    </main>
  );
}

function ProductPreview({ product }: { product: any }) {
  const imageSrc = resolveStorefrontImageSrc(product.images?.[0]);
  const price = Number(product.price || 0);
  const mrp = Number(product.mrp || price);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <div className="grid gap-7 rounded-3xl border border-[#ead8b8] bg-white p-5 shadow-xs lg:grid-cols-2 sm:p-7">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#fffaf5]">
        <Image
          src={imageSrc}
          alt={product.title}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain"
          priority
        />
      </div>

      <div className="flex flex-col justify-center">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b5843d]">{product.category}</p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-gray-900 sm:text-3xl">{product.title}</h1>
        <div className="mt-5 flex flex-wrap items-baseline gap-3">
          <span className="text-4xl font-black text-[#741f23]">₹{price.toLocaleString('en-IN')}</span>
          {mrp > price && <span className="text-sm font-bold text-gray-400 line-through">₹{mrp.toLocaleString('en-IN')}</span>}
          {discount > 0 && <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-black text-green-700">{discount}% OFF</span>}
        </div>
        <p className="mt-2 text-xs font-semibold text-gray-500">Inclusive of applicable GST</p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" className="rounded-xl bg-[#741f23] px-4 py-3 text-sm font-bold text-white">Add to Cart</button>
          <button type="button" className="rounded-xl bg-[#d7aa5b] px-4 py-3 text-sm font-black text-[#4a2400]">Buy Now</button>
        </div>

        <p className="mt-6 line-clamp-5 text-xs leading-relaxed text-gray-600">{product.description}</p>
        <Link href={`/product/${product.id}`} className="mt-5 text-xs font-black text-[#741f23] underline underline-offset-4">
          Open current live product page
        </Link>
      </div>
    </div>
  );
}
