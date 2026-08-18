'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import { pushProductToCourierCatalog } from '@/actions/courierCatalog';
import { PackagePlus, CheckCircle2, Loader2, Sparkles, Scale, Tag, Hash, ShieldCheck } from 'lucide-react';

export default function DirectProductUploader() {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    style_code: '',
    net_weight: '',
    price: '',
    stock: '50',
    category: 'Kitchenware',
    hsn_code: '7323',
    gst_rate: '5',
    image: '',
    video: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.image) {
      alert('Please fill in Product Title, Price, and Image URL.');
      return;
    }

    setLoading(true);
    setSuccessMsg('');

    try {
      // 1. Direct Insert into Supabase 'products' table
      const { error } = await supabase.from('products').insert([
        {
          title: formData.title,
          description: formData.description,
          style_code: formData.style_code || 'SKU-001',
          net_weight: formData.net_weight || '500g',
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 50,
          category: formData.category,
          hsn_code: formData.hsn_code,
          gst_rate: parseFloat(formData.gst_rate),
          images: [formData.image.trim()],
          video: formData.video.trim() || null
        }
      ]);

      if (error) {
        throw new Error('Supabase Error: ' + error.message);
      }

      // 2. Automatically sync product to NimbusPost Courier Catalog
      await pushProductToCourierCatalog({
        title: formData.title,
        style_code: formData.style_code,
        price: parseFloat(formData.price),
        net_weight: formData.net_weight || '0.5',
        hsn_code: formData.hsn_code,
        gst_rate: parseFloat(formData.gst_rate),
        category: formData.category
      });

      setSuccessMsg('🎉 Product successfully published on Sastabazar Website AND synced with Courier Catalog!');
      setFormData({
        title: '',
        description: '',
        style_code: '',
        net_weight: '',
        price: '',
        stock: '50',
        category: 'Kitchenware',
        hsn_code: '7323',
        gst_rate: '5',
        image: '',
        video: ''
      });
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between" suppressHydrationWarning>
      <div>
        <Header />

        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-6">
            
            <div className="border-b pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-indigo-950 flex items-center gap-2">
                  <PackagePlus className="text-orange-500" size={28} /> Direct Product Uploader & Sync
                </h1>
                <p className="text-xs text-gray-500 mt-1">Uploads to Supabase Database & NimbusPost Courier Catalog simultaneously.</p>
              </div>
              <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-green-200 flex items-center gap-1">
                <ShieldCheck size={14} /> Auto-Sync Active
              </span>
            </div>

            {successMsg && (
              <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={18} /> {successMsg}
              </div>
            )}

            <form onSubmit={handleDirectUpload} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Title</label>
                <input 
                  type="text" 
                  name="title"
                  required
                  placeholder="e.g. Premium Stainless Steel Cookware Set"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-xs border rounded-xl focus:ring-2 focus:ring-indigo-600 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                    <Tag size={14} className="text-indigo-600" /> Style Code / SKU
                  </label>
                  <input 
                    type="text" 
                    name="style_code"
                    placeholder="e.g. SB-COOK-01"
                    value={formData.style_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                    <Scale size={14} className="text-indigo-600" /> Net Weight (e.g. 1.2 kg)
                  </label>
                  <input 
                    type="text" 
                    name="net_weight"
                    placeholder="e.g. 1.2"
                    value={formData.net_weight}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Price (Incl. GST) ₹</label>
                  <input 
                    type="number" 
                    name="price"
                    required
                    placeholder="499"
                    value={formData.price}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl font-black text-orange-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1">
                    <Hash size={14} className="text-indigo-600" /> HSN Code
                  </label>
                  <input 
                    type="text" 
                    name="hsn_code"
                    required
                    placeholder="7323"
                    value={formData.hsn_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">GST Rate (%)</label>
                  <select 
                    name="gst_rate"
                    value={formData.gst_rate}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl bg-white font-bold"
                  >
                    <option value="5">5% GST Included</option>
                    <option value="12">12% GST Included</option>
                    <option value="18">18% GST Included</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl bg-white"
                  >
                    <option value="Kitchenware">Kitchenware</option>
                    <option value="Storage">Storage</option>
                    <option value="Appliances">Appliances</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Home Decor">Home Decor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Initial Stock Qty</label>
                  <input 
                    type="number" 
                    name="stock"
                    required
                    placeholder="50"
                    value={formData.stock}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 text-xs border rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Image URL</label>
                <input 
                  type="text" 
                  name="image"
                  required
                  placeholder="https://images.unsplash.com/...jpg"
                  value={formData.image}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-xs border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Video URL (Optional)</label>
                <input 
                  type="text" 
                  name="video"
                  placeholder="https://.../video.mp4"
                  value={formData.video}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-xs border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Product Description</label>
                <textarea 
                  name="description"
                  rows={3}
                  placeholder="Write product highlights..."
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-3 text-xs border rounded-xl"
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition shadow-lg text-sm"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} 
                {loading ? 'Publishing & Syncing...' : 'Publish to Website & Sync with Courier'}
              </button>

            </form>

          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}