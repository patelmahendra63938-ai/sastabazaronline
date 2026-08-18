'use client';
import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Tag, Image as ImageIcon, Loader2, Trash2, Power, Edit } from 'lucide-react';

export default function AdminDiscountsPage() {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchPromotions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (!error && data) setPromotions(data);
    setLoading(false);
  };

  useEffect(() => { fetchPromotions(); }, []);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await supabase.from('promotions').update({ is_enabled: !currentStatus }).eq('id', id);
    fetchPromotions();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete "${name}"?\nThis action cannot be undone.`)) {
      await supabase.from('promotions').delete().eq('id', id);
      fetchPromotions();
    }
  };

  const getStatus = (start: string, end: string, is_enabled: boolean) => {
    if (!is_enabled) return <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-[10px] font-bold">DISABLED</span>;
    const now = new Date().getTime();
    const st = new Date(start).getTime();
    const en = new Date(end).getTime();
    if (now < st) return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold">SCHEDULED</span>;
    if (now > en) return <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-[10px] font-bold">EXPIRED</span>;
    return <span className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full text-[10px] font-bold">ACTIVE</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">Discount & Promotion Manager</h1>
        <p className="text-xs text-gray-500 mt-1">Manage sales, banners, and scheduled price discounts securely.</p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex items-center justify-center text-xs text-gray-500">
            <Loader2 size={20} className="animate-spin text-orange-500 mr-2" /> Loading Promotions...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-[11px] font-bold text-gray-500 uppercase">
                  <th className="p-4">Promotion Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Priority</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {promotions.map(promo => (
                  <tr key={promo.id} className="hover:bg-gray-50/50 transition">
                    <td className="p-4 font-bold text-gray-900 flex items-center gap-3">
                      {promo.banner_url ? (
                        <img src={promo.banner_url} alt="" className="w-10 h-10 object-cover rounded-lg border shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded-lg border shrink-0 text-gray-400"><ImageIcon size={16} /></div>
                      )}
                      {promo.name}
                    </td>
                    <td className="p-4 text-gray-600">{promo.target_category || 'All Categories'}</td>
                    <td className="p-4 font-black text-indigo-950">
                      {promo.discount_type === 'PERCENTAGE' ? `${promo.discount_value}% OFF` : `₹${promo.discount_value} OFF`}
                    </td>
                    <td className="p-4">{getStatus(promo.start_at, promo.end_at, promo.is_enabled)}</td>
                    <td className="p-4 font-mono text-gray-500">Level {promo.priority}</td>
                    <td className="p-4 flex items-center justify-end gap-2">
                      <button onClick={() => handleToggle(promo.id, promo.is_enabled)} className={`p-2 rounded-lg transition ${promo.is_enabled ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-200'}`} title={promo.is_enabled ? "Disable" : "Enable"}>
                        <Power size={16} />
                      </button>
                      <button onClick={() => handleDelete(promo.id, promo.name)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition" title="Delete Promotion">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}