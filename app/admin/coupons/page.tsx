'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createCampaignAction } from './actions';
import { Ticket, Plus, Trash2, Loader2, Sparkles, Power, ArrowLeft } from 'lucide-react';

export default function AdminCouponsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'create'>('dashboard');
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_value: '',
    campaign_mode: 'AUTOMATIC',
    coupon_code: '',
    target_category: 'ALL',
    start_at: '',
    end_at: '',
    theme: 'Festive',
    is_homepage_visible: true,
  });

  const [eligibleProductCount, setEligibleProductCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchEligibleCount() {
      if (!formData.target_category || formData.target_category === 'ALL') {
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true);
        setEligibleProductCount(count);
      } else {
        const { count } = await supabase.from('products').select('*', { count: 'exact', head: true })
          .eq('is_active', true)
          .eq('category', formData.target_category);
        setEligibleProductCount(count);
      }
    }
    fetchEligibleCount();
  }, [formData.target_category]);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setCampaigns(data);
    } else if (error) {
      console.error('[SASTABAZARONLINE ERROR] Failed to fetch campaigns:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const slug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const newCampaignPayload = {
      name: formData.name,
      slug: slug,
      description: formData.description,
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      campaign_mode: formData.campaign_mode,
      coupon_code: formData.campaign_mode !== 'AUTOMATIC' ? formData.coupon_code.toUpperCase() : null,
      target_category: formData.target_category === 'ALL' ? null : formData.target_category,
      start_at: new Date(formData.start_at).toISOString(),
      end_at: new Date(formData.end_at).toISOString(),
      theme: formData.theme,
      is_homepage_visible: formData.is_homepage_visible,
      is_enabled: true,
    };

    const result = await createCampaignAction(newCampaignPayload);

    if (result.success) {
      alert(`Campaign published successfully for SASTABAZARONLINE!\nCustomer URL route generated: /sale/${slug}`);
      setView('dashboard');
      fetchCampaigns();
      setFormData({
        name: '', description: '', discount_type: 'PERCENTAGE', discount_value: '', 
        campaign_mode: 'AUTOMATIC', coupon_code: '', target_category: 'ALL', 
        start_at: '', end_at: '', theme: 'Festive', is_homepage_visible: true
      });
    } else {
      alert(`Error creating campaign: ${result.error}`);
    }
    setSubmitting(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('promotions')
      .update({ is_enabled: !currentStatus })
      .eq('id', id);

    if (error) {
      alert(`Failed to update status: ${error.message}`);
    } else {
      fetchCampaigns();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the "${name}" campaign from SASTABAZARONLINE? This cannot be undone.`)) {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Failed to delete campaign from database: ${error.message}`);
        console.error('Supabase Delete Error:', error);
      } else {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        alert(`Campaign "${name}" was successfully deleted from SASTABAZARONLINE.`);
        fetchCampaigns();
      }
    }
  };

  const getStatus = (start: string, end: string, is_enabled: boolean) => {
    if (!is_enabled) return { label: 'DISABLED', classes: 'bg-gray-100 text-gray-600 border-gray-200' };
    const now = new Date().getTime();
    if (now < new Date(start).getTime()) return { label: 'UPCOMING', classes: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (now > new Date(end).getTime()) return { label: 'EXPIRED', classes: 'bg-red-50 text-red-700 border-red-200' };
    return { label: 'LIVE NOW', classes: 'bg-green-50 text-green-700 border-green-200' };
  };

  const now = new Date().getTime();
  const liveCount = campaigns.filter(c => c.is_enabled && new Date(c.start_at).getTime() <= now && new Date(c.end_at).getTime() > now).length;
  const upcomingCount = campaigns.filter(c => c.is_enabled && new Date(c.start_at).getTime() > now).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950">Coupons & Festival Campaigns</h1>
          <p className="text-xs text-gray-500 mt-1">Create powerful festival sales, seasonal offers and discount codes for SASTABAZARONLINE.</p>
        </div>
        <div>
          {view === 'create' ? (
            <button onClick={() => setView('dashboard')} className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 flex items-center gap-2 transition cursor-pointer">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          ) : (
            <button onClick={() => setView('create')} className="px-5 py-2.5 bg-orange-500 text-white font-bold text-xs rounded-xl hover:bg-orange-600 flex items-center gap-2 shadow-md transition cursor-pointer">
              <Sparkles size={16} /> Create Campaign
            </button>
          )}
        </div>
      </div>

      {view === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Live Campaigns</p><p className="text-2xl font-black text-green-600">{liveCount}</p></div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Upcoming</p><p className="text-2xl font-black text-blue-600">{upcomingCount}</p></div>
            <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-gray-500 uppercase">Total Offers</p><p className="text-2xl font-black text-indigo-950">{campaigns.length}</p></div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 font-bold text-xs text-gray-700 uppercase">
              All Campaigns & Promotions — SASTABAZARONLINE
            </div>
            {loading ? (
              <div className="p-16 flex justify-center text-gray-500"><Loader2 size={24} className="animate-spin text-orange-500" /></div>
            ) : campaigns.length === 0 ? (
              <div className="p-16 text-center text-gray-400 text-sm">No campaigns found. Create your first festival sale for SASTABAZARONLINE!</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-[10px] font-bold text-gray-400 uppercase bg-white">
                      <th className="p-4">Campaign Name</th>
                      <th className="p-4">Discount</th>
                      <th className="p-4">Dates</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campaigns.map(c => {
                      const status = getStatus(c.start_at, c.end_at, c.is_enabled);
                      return (
                        <tr key={c.id} className="hover:bg-gray-50/50">
                          <td className="p-4">
                            <p className="font-bold text-gray-900 text-sm mb-1">{c.name}</p>
                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                              {c.campaign_mode === 'AUTOMATIC' ? <Sparkles size={10} /> : <Ticket size={10} />}
                              {c.campaign_mode} • {c.target_category || 'All Categories'}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-black text-indigo-950 text-sm">
                              {c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                            </p>
                            {c.coupon_code && <span className="bg-gray-100 border text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-mono mt-1 inline-block">{c.coupon_code}</span>}
                          </td>
                          <td className="p-4 text-gray-500">
                            <p>{new Date(c.start_at).toLocaleDateString()}</p>
                            <p>to {new Date(c.end_at).toLocaleDateString()}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.classes}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="p-4 flex items-center justify-end gap-2">
                            <button onClick={() => handleToggleStatus(c.id, c.is_enabled)} className={`p-2 rounded-lg transition cursor-pointer ${c.is_enabled ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-200'}`} title={c.is_enabled ? "Disable" : "Enable"}>
                              <Power size={16} />
                            </button>
                            <button onClick={() => handleDelete(c.id, c.name)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition cursor-pointer" title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'create' && (
        <form onSubmit={handleCreateCampaign} className="bg-white p-6 md:p-8 rounded-2xl border shadow-sm space-y-8">
          <div>
            <h3 className="text-sm font-black text-indigo-950 uppercase border-b pb-2 mb-4">1. Campaign Details — SASTABAZARONLINE</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="md:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Campaign Name</label>
                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} placeholder="e.g. Diwali Mega Sale" className="w-full px-4 py-3 border rounded-xl" />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Short Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Celebrate with special savings..." className="w-full px-4 py-3 border rounded-xl h-20" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Visual Theme</label>
                <select name="theme" value={formData.theme} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-xl bg-white">
                  <option value="Festive">Festive (Orange)</option>
                  <option value="Wedding">Wedding (Rose)</option>
                  <option value="Luxury">Luxury (Dark Indigo)</option>
                  <option value="Clearance">Clearance (Red)</option>
                </select>
              </div>
              <div className="flex items-center mt-6">
                <label className="flex items-center gap-3 font-bold text-gray-700 cursor-pointer">
                  <input type="checkbox" name="is_homepage_visible" checked={formData.is_homepage_visible} onChange={handleInputChange} className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                  Show Banner on SASTABAZARONLINE Homepage
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-indigo-950 uppercase border-b pb-2 mb-4">2. Offer & Category Targeting Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Discount Type</label>
                <select name="discount_type" value={formData.discount_type} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-xl bg-white">
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Discount Value</label>
                <input type="number" name="discount_value" required min="1" value={formData.discount_value} onChange={handleInputChange} placeholder={formData.discount_type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'} className="w-full px-4 py-3 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Campaign Mode</label>
                <select name="campaign_mode" value={formData.campaign_mode} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-xl bg-white">
                  <option value="AUTOMATIC">Automatic (Applies to category products)</option>
                  <option value="COUPON">Coupon Code Required</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
              {formData.campaign_mode !== 'AUTOMATIC' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Coupon Code</label>
                  <input type="text" name="coupon_code" required value={formData.coupon_code} onChange={handleInputChange} placeholder="e.g. DIWALI20" className="w-full px-4 py-3 border rounded-xl uppercase font-mono" />
                </div>
              )}
              
              <div className="md:col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Target Category</label>
                <select name="target_category" value={formData.target_category} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-xl bg-white font-medium">
                  <option value="ALL">All Categories (Entire Store)</option>
                  <option value="Home & Kitchen">Home & Kitchen</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                  <option value="Grocery">Grocery</option>
                </select>
                
                {eligibleProductCount !== null && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-xs text-green-700 font-bold">
                    <span className="text-base">✓</span>
                    <p>Targeting entire {formData.target_category === 'ALL' ? 'store' : formData.target_category} category. This campaign will apply automatically to {eligibleProductCount} products on SASTABAZARONLINE.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-indigo-950 uppercase border-b pb-2 mb-4">3. Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Start Date & Time</label>
                <input type="datetime-local" name="start_at" required value={formData.start_at} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-xl" />
              </div>
              <div>
                <label className="block font-bold text-gray-700 md:g-auto px-8 py-4 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-sm uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 cursor-pointer">End Date & Time</label>
                <input type="datetime-local" name="end_at" required value={formData.end_at} onChange={handleInputChange} className="w-full px-4 py-3 border rounded-xl" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <button type="submit" disabled={submitting} className="w-full md:w-auto px-8 py-4 bg-indigo-950 hover:bg-indigo-900 text-white font-black text-sm uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 cursor-pointer">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Publish Campaign to SASTABAZARONLINE
            </button>
          </div>
        </form>
      )}
    </div>
  );
}