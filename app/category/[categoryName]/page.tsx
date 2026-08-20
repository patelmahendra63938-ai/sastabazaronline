export const revalidate = 60; // 60 સેકન્ડ સુધી ડેટા સર્વર પર સેવ (Cache) રહેશે
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';
import ProductCard, { Product } from '@/components/ProductCard';
import Link from 'next/link';

async function getProductsByCategory(categoryName: string): Promise<Product[]> {
  const decodedCategory = decodeURIComponent(categoryName);
  const { data, error } = await supabase
    .from('products')
    .select('id, title, price, mrp, category, images, image, stock')
    .eq('is_active', true)
    .ilike('category', `%${decodedCategory}%`)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data;
}

export default async function CategoryPage({ params }: { params: { categoryName: string } }) {
  const resolvedParams = await params;
  const categoryName = resolvedParams.categoryName;
  const decodedCategory = decodeURIComponent(categoryName);
  const products = await getProductsByCategory(categoryName);

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-indigo-950 text-white p-6 rounded-2xl mb-8 flex justify-between items-center shadow-md">
          <div>
            <span className="text-xs bg-orange-500 px-2.5 py-1 rounded-md font-bold uppercase">Category Section</span>
            <h1 className="text-2xl sm:text-3xl font-black mt-2">{decodedCategory}</h1>
            <p className="text-xs text-gray-300 mt-1">Explore high quality and trending items in {decodedCategory}</p>
          </div>
          <Link href="/" className="text-xs font-bold text-orange-400 hover:underline bg-indigo-900 px-4 py-2 rounded-xl">
            ← Back to Home
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-gray-800">No products found in this category!</h3>
            <p className="text-sm text-gray-500 mt-1">You can add products to this category via the Admin Panel (`/admin`).</p>
            <Link href="/" className="mt-4 inline-block bg-indigo-950 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-900 transition">
              Go to Home
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
