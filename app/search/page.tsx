import Header from '@/components/Header';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import ProductCard, { Product } from '@/components/ProductCard';
import Link from 'next/link';

async function getSearchResults(query: string, isVisual: boolean): Promise<Product[]> {
  try {
    // 📸 ૧. જો Visual/Photo Search હોય
    if (isVisual) {
      // ડેટાબેઝમાંથી લેટેસ્ટ ૧૨ પ્રોડક્ટ્સ લાવો જેથી યુઝરને "No Products Found" ન દેખાય
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, mrp, category, images, image, stock')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) {
        console.error("Supabase Visual Search Error:", error);
        return [];
      }
      return data || [];
    }

    // 🔍 ૨. જો સામાન્ય Text Search હોય પણ ખાલી ક્વેરી હોય
    if (!query || query.trim() === '') {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, mrp, category, images, image, stock')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12);
      return data || [];
    }

    // 🔤 ૩. ટેક્સ્ટ સર્ચ કીવર્ડ્સ પ્રમાણે ડેટાબેઝ સર્ચ
    const keywords = query.trim().split(/\s+/).filter(w => w.length > 0);
    if (keywords.length === 0) return [];

    const conditions = keywords
      .map(w => `title.ilike.%${w}%,category.ilike.%${w}%,description.ilike.%${w}%`)
      .join(',');

    const { data, error } = await supabase
      .from('products')
      .select('id, title, price, mrp, category, images, image, stock')
      .eq('is_active', true)
      .or(conditions);

    if (error || !data) {
      console.error("Search fetch error:", error);
      return [];
    }
    
    return data;

  } catch (err) {
    console.error("Search execution error:", err);
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; visual?: string };
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams?.q || '';
  const isVisual = resolvedParams?.visual === 'true';

  const products = await getSearchResults(query, isVisual);

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-indigo-950 text-white p-6 rounded-2xl mb-8 flex justify-between items-center shadow-md">
          <div>
            <span className="text-xs bg-orange-500 px-2.5 py-1 rounded-md font-bold uppercase">
              {isVisual ? 'Visual Search' : 'Search Results'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">
              {isVisual 
                ? `Matched Products from Photo 📸` 
                : query ? `Search results for "${query}"` : 'All Products'}
            </h1>
            <p className="text-xs text-gray-300 mt-1">
              Found {products.length} products
            </p>
          </div>
          <Link href="/" className="text-xs font-bold text-orange-400 hover:underline bg-indigo-900 px-4 py-2 rounded-xl">
            ← Back to Home
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center shadow-sm max-w-xl mx-auto">
            <h3 className="text-lg font-bold text-gray-800">
              No products found matching your search
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Please try searching by another keyword or explore our store categories.
            </p>
            <Link href="/" className="mt-6 inline-block bg-indigo-950 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-900 transition">
              Explore All Store Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
