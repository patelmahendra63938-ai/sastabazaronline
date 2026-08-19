'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Truck, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  Loader2, 
  RefreshCw, 
  Package, 
  Settings2,
  Lock
} from 'lucide-react';

export default function AdminShippingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logistics & Rule Configuration State
  const [settings, setSettings] = useState({
    free_shipping_enabled: true,
    free_shipping_threshold: 499,
    courier_multiplier: 1.30,
    weight_buffer_pct: 15,
    cod_charge: 35.00
  });

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string>('ADMIN');

  // 1. Load active settings from Supabase
  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value, updated_at, updated_by')
        .eq('key', 'shipping_rules')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        setSettings({
          free_shipping_enabled: Boolean(data.value.free_shipping_enabled),
          free_shipping_threshold: Number(data.value.free_shipping_threshold) || 499,
          courier_multiplier: Number(data.value.courier_multiplier) || 1.30,
          weight_buffer_pct: Number(data.value.weight_buffer_pct) || 15,
          cod_charge: Number(data.value.cod_charge) ?? 35.00
        });
        setLastUpdated(data.updated_at ? new Date(data.updated_at).toLocaleString('en-IN') : null);
        setUpdatedBy(data.updated_by || 'ADMIN');
      }
    } catch (err: any) {
      console.error('Error fetching shipping settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 2. Save modified settings to Supabase
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    // Validation
    if (settings.free_shipping_threshold < 0) {
      setStatusMsg({ type: 'error', text: 'Free shipping threshold cannot be negative.' });
      setSaving(false);
      return;
    }

    if (settings.courier_multiplier < 1.0) {
      setStatusMsg({ type: 'error', text: 'Courier multiplier cannot be less than 1.00.' });
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          key: 'shipping_rules',
          value: {
            free_shipping_enabled: settings.free_shipping_enabled,
            free_shipping_threshold: Number(settings.free_shipping_threshold),
            courier_multiplier: Number(settings.courier_multiplier),
            weight_buffer_pct: Number(settings.weight_buffer_pct),
            cod_charge: Number(settings.cod_charge),
            cost_buffer_pct: Math.round((Number(settings.courier_multiplier) - 1) * 100)
          },
          updated_by: 'ADMIN'
        });

      if (error) throw error;

      setStatusMsg({ type: 'success', text: 'Logistics rules & shipping settings successfully updated.' });
      await loadSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update shipping settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="animate-spin text-indigo-950" size={32} />
        <span className="text-xs font-bold text-gray-500">Loading shipping configuration...</span>
      </div>
    );
  }

  const calculatedBufferPct = Math.round((settings.courier_multiplier - 1) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-indigo-950">Shipping & Courier Logistics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage NimbusPost freight rates, RTO risk buffers, free shipping rules, and AWB dispatch.
          </p>
        </div>
        <button
          type="button"
          onClick={loadSettings}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-indigo-950 text-xs font-bold rounded-xl border border-gray-200 shadow-2xs transition cursor-pointer self-start"
        >
          <RefreshCw size={13} />
          <span>Sync Settings</span>
        </button>
      </div>

      {/* Integration Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-2xl gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-bold shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">NimbusPost Automated API Dispatch</h3>
            <p className="text-xs text-orange-800">
              Live freight calculation and AWB allocation connected through Surat Fulfillment Warehouse.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto bg-green-100 text-green-800 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-green-300 flex items-center gap-1 shrink-0">
          <CheckCircle2 size={13} /> Active Configuration
        </span>
      </div>

      {/* Notification Strip */}
      {statusMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} className="text-green-600 shrink-0" /> : <AlertCircle size={16} className="text-red-600 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Live Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-gray-200/80 rounded-2xl bg-white space-y-1 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Free Shipping Status</span>
          <div className="flex items-center justify-between">
            <p className="text-base font-black text-indigo-950">
              {settings.free_shipping_enabled ? `Above ₹${settings.free_shipping_threshold}` : 'Disabled'}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${settings.free_shipping_enabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
              {settings.free_shipping_enabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <p className="text-[10px] text-gray-500">Applies to courier charges</p>
        </div>

        <div className="p-4 border border-gray-200/80 rounded-2xl bg-white space-y-1 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">RTO / Risk Buffer</span>
          <p className="text-base font-black text-indigo-950">{calculatedBufferPct}% ({settings.courier_multiplier.toFixed(2)}x)</p>
          <p className="text-[10px] text-gray-500">Added to courier base rates</p>
        </div>

        <div className="p-4 border border-gray-200/80 rounded-2xl bg-white space-y-1 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">COD Handling Fee</span>
          <p className="text-base font-black text-indigo-950">₹{settings.cod_charge.toFixed(2)}</p>
          <p className="text-[10px] text-gray-500">Charged strictly on COD</p>
        </div>

        <div className="p-4 border border-gray-200/80 rounded-2xl bg-white space-y-1 shadow-2xs">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Packaging Weight Buffer</span>
          <p className="text-base font-black text-indigo-950">{settings.weight_buffer_pct}%</p>
          <p className="text-[10px] text-gray-500">Added for tare weight allowance</p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* Section 1: Free Shipping Configuration */}
        <div className="space-y-4 border-b border-gray-100 pb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} className="text-orange-500" /> 1. Free Shipping Rule
            </h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.free_shipping_enabled}
                onChange={e => setSettings({ ...settings, free_shipping_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              <span className="ml-2 text-xs font-bold text-gray-700">
                {settings.free_shipping_enabled ? 'Active (ON)' : 'Disabled (OFF)'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Minimum Order Qualifying Amount (₹) *
              </label>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={settings.free_shipping_threshold}
                onChange={e => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
                placeholder="499"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Orders with qualifying discounted subtotal at or above this amount receive free courier delivery (e.g., ₹499, ₹500, ₹899, ₹1500).
              </p>
            </div>
            <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-[11px] text-indigo-950 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck size={14} className="text-indigo-600" /> Rule Enforcement Note:
              </p>
              <p className="text-gray-600 text-[10px]">
                Free shipping applies strictly to the courier fee. COD handling charges (if selected by the customer) remain separate unless specifically discounted.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Courier Risk / RTO Multiplier */}
        <div className="space-y-4 border-b border-gray-100 pb-6">
          <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-600" /> 2. Courier RTO / Return-Risk Adjustment
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Courier Multiplier Factor (e.g. 1.30 = +30%) *
              </label>
              <input
                type="number"
                min={1.00}
                max={3.00}
                step={0.05}
                required
                value={settings.courier_multiplier}
                onChange={e => setSettings({ ...settings, courier_multiplier: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Authoritative factor applied to raw NimbusPost base freight rates to cover RTO and return logistics risk (1.00 = 0%, 1.20 = 20%, 1.30 = 30%).
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1.5">
              <span className="font-bold text-gray-700">Live Calculation Preview:</span>
              <p className="text-gray-600 text-[11px]">
                NimbusPost Base Rate: <span className="font-mono font-bold text-gray-900">₹70.00</span>
              </p>
              <p className="text-gray-600 text-[11px]">
                Risk Handling (+{calculatedBufferPct}%): <span className="font-mono font-bold text-gray-900">₹{(70 * (settings.courier_multiplier - 1)).toFixed(2)}</span>
              </p>
              <p className="text-indigo-950 font-bold text-xs pt-1 border-t border-gray-200">
                Customer Courier Rate: <span className="font-mono text-orange-600 font-black">₹{Math.ceil(70 * settings.courier_multiplier).toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: COD Charge & Weight Buffers */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
            <Settings2 size={16} className="text-gray-700" /> 3. Additional Fees & Buffers
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                COD Handling Fee (₹) *
              </label>
              <input
                type="number"
                min={0}
                step={1}
                required
                value={settings.cod_charge}
                onChange={e => setSettings({ ...settings, cod_charge: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Fixed doorstep cash collection fee added exclusively when customer selects Cash on Delivery.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Packaging Tare Weight Buffer (%) *
              </label>
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                required
                value={settings.weight_buffer_pct}
                onChange={e => setSettings({ ...settings, weight_buffer_pct: Number(e.target.value) })}
                className="w-full px-3 py-2.5 border rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-950 focus:outline-hidden bg-gray-50 focus:bg-white"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Tare buffer added to combined product net weights to prevent courier weight discrepancies (default 15%).
              </p>
            </div>
          </div>
        </div>

        {/* Audit & Submission Bar */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-[11px] text-gray-400">
            {lastUpdated ? (
              <span>Last updated: <b className="text-gray-700">{lastUpdated}</b> by <b className="text-gray-700">{updatedBy}</b></span>
            ) : (
              <span>System defaults loaded</span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-indigo-950 hover:bg-indigo-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}