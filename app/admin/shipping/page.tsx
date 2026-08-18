'use client';

import React from 'react';
import { Truck, ShieldCheck, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

export default function AdminShippingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">Shipping & Courier Logistics (NimbusPost)</h1>
        <p className="text-xs text-gray-500 mt-1">Manage automated weight buffers (15%), logistics risk margins (30%), and AWB dispatch.</p>
      </div>

      <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center font-bold">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">NimbusPost API Integration Status</h3>
              <p className="text-xs text-orange-800">Ready for configuration. System is currently running on intelligent weight-slab fallback calculations.</p>
            </div>
          </div>
          <span className="bg-orange-100 text-orange-800 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-orange-300">
            Pending API Key
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Packaging Weight Buffer</span>
            <p className="text-lg font-black text-indigo-950">15%</p>
            <p className="text-[10px] text-gray-500">Added to actual product weight automatically.</p>
          </div>
          <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Logistics Cost / RTO Buffer</span>
            <p className="text-lg font-black text-indigo-950">30%</p>
            <p className="text-[10px] text-gray-500">Calculated over base courier charges.</p>
          </div>
          <div className="p-4 border rounded-xl bg-gray-50 space-y-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase">Free Shipping Threshold</span>
            <p className="text-lg font-black text-green-600">₹499</p>
            <p className="text-[10px] text-gray-500">Orders above ₹499 qualify for free delivery.</p>
          </div>
        </div>
      </div>
    </div>
  );
}