import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const supabase = await createServerSupabaseClient();
  
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(12);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="mb-8 bg-indigo-950 rounded-3xl p-8 md:p-12 text-white text-center shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Welcome to SASTABAZARONLINE
            </h1>
            <p className="text-sm md:text-base text-indigo-100 max-w-2xl mx-auto font-medium">
              India's Most Trusted Wholesale Hub. Now shop in your own language!
            </p>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-indigo-900/50 transform -skew-y-3 z-0"></div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">Trending Products</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products && products.length > 0 ? (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 py-12 bg-white rounded-2xl border border-gray-200">
              <p className="text-lg font-bold text-gray-800">No products found!</p>
              <p className="text-sm">Please add some products from the Admin Panel.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
