'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Zap, ShieldCheck, Truck, RotateCcw, Check } from 'lucide-react';

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(
    product.images?.[0] || product.image || 'https://via.placeholder.com/500'
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [selectedImage];
  const discount = product.mrp && product.mrp > product.price 
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100) 
    : 0;

  const handleAddToCart = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('sastabazar_cart') || '[]');
      const itemIndex = existing.findIndex((item: any) => (item.id || item.product_id) === product.id);

      if (itemIndex > -1) {
        existing[itemIndex].quantity += quantity;
      } else {
        existing.push({
          id: product.id,
          product_id: product.id,
          title: product.title,
          price: product.price,
          mrp: product.mrp || product.price,
          image: selectedImage,
          quantity: quantity,
        });
      }

      localStorage.setItem('sastabazar_cart', JSON.stringify(existing));
      window.dispatchEvent(new Event('cartUpdated'));
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Product Image Gallery */}
      <div className="space-y-4">
        <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border">
          <img src={selectedImage} alt={product.title} className="w-full h-full object-cover" />
        </div>

        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img: string, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 ${selectedImage === img ? 'border-indigo-600' : 'border-gray-200'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Details & Actions */}
      <div className="space-y-5 flex flex-col justify-between">
        <div className="space-y-3">
          {product.category && (
            <span className="bg-orange-100 text-orange-800 text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
              {product.category}
            </span>
          )}
          <h1 className="text-xl sm:text-2xl font-black text-indigo-950">{product.title}</h1>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 pt-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-950">
              ₹{Number(product.price).toLocaleString()}
            </span>
            {product.mrp && product.mrp > product.price && (
              <>
                <span className="text-sm text-gray-400 line-through">₹{Number(product.mrp).toLocaleString()}</span>
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">{discount}% OFF</span>
              </>
            )}
          </div>

          <p className="text-xs text-gray-600 leading-relaxed pt-2">
            {product.description || 'Premium quality fabric engineered for comfort and long-lasting durability.'}
          </p>

          {/* Quantity Selector */}
          <div className="flex items-center gap-3 pt-3">
            <label className="text-xs font-bold text-gray-700 uppercase">Quantity:</label>
            <div className="flex items-center border rounded-xl overflow-hidden">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 font-bold text-xs"
              >-</button>
              <span className="px-4 py-1.5 font-bold text-xs font-mono">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 font-bold text-xs"
              >+</button>
            </div>
          </div>
        </div>

        {/* Buttons & Trust Badges */}
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleAddToCart}
              className="bg-indigo-950 hover:bg-indigo-900 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-sm"
            >
              {added ? <Check size={16} className="text-green-400" /> : <ShoppingCart size={16} />}
              {added ? 'Added to Cart!' : 'Add to Cart'}
            </button>

            <button
              onClick={handleBuyNow}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 text-xs shadow-md"
            >
              <Zap size={16} /> Buy Now
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center text-[10px] text-gray-500 font-semibold">
            <div className="p-2 bg-gray-50 rounded-xl flex flex-col items-center gap-1">
              <Truck size={14} className="text-indigo-600" /> Fast Delivery
            </div>
            <div className="p-2 bg-gray-50 rounded-xl flex flex-col items-center gap-1">
              <RotateCcw size={14} className="text-orange-500" /> 7-Day Easy Return
            </div>
            <div className="p-2 bg-gray-50 rounded-xl flex flex-col items-center gap-1">
              <ShieldCheck size={14} className="text-green-600" /> 100% Genuine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}