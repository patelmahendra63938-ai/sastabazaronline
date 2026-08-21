import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AdminIntegrationsPage() {
  // Check active environment variables securely on the server
  const isSupabaseActive = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const isCourierActive = Boolean(
    process.env.NIMBUSPOST_API_KEY &&
    process.env.NIMBUSPOST_API_SECRET &&
    /^\d{6}$/.test(process.env.NIMBUSPOST_PICKUP_PINCODE?.trim() || '')
  );
  const isSmtpActive = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
  const isWhatsappActive = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && (process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN));
  const isMerchantActive = true; // Dynamic XML catalog feed is active at /api/feed/merchant.xml

  const integrationsList = [
    {
      name: 'Supabase Database & Auth',
      status: isSupabaseActive ? 'CONNECTED' : 'READY_FOR_CONFIGURATION',
      desc: 'Core PostgreSQL database, row level security, and cookie-based auth.',
      type: 'Database',
    },
    {
      name: 'NimbusPost Logistics API',
      status: isCourierActive ? 'CONNECTED' : 'READY_FOR_CONFIGURATION',
      desc: 'V2 live serviceability and internal rate verification. Shipment/AWB booking is not enabled.',
      type: 'Shipping',
    },
    {
      name: 'GoDaddy Titan SMTP',
      status: isSmtpActive ? 'CONNECTED' : 'READY_FOR_CONFIGURATION',
      desc: 'Transactional email notifications sent via sales@sastabazaronline.in.',
      type: 'Email',
    },
    {
      name: 'Meta WhatsApp Cloud API',
      status: isWhatsappActive ? 'CONNECTED' : 'READY_FOR_CONFIGURATION',
      desc: 'Instant customer WhatsApp order dispatch and AWB alerts.',
      type: 'Messaging',
    },
    {
      name: 'Google Merchant Center',
      status: isMerchantActive ? 'CONNECTED' : 'READY_FOR_CONFIGURATION',
      desc: 'Dynamic XML product catalog feed (/api/feed/merchant.xml).',
      type: 'SEO / Shopping',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-indigo-950">Integration Management</h1>
        <p className="text-xs text-gray-500 mt-1">
          Centralized status monitor for all connected external services and APIs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {integrationsList.map((item, idx) => {
          const isConnected = item.status === 'CONNECTED';
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border p-6 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md">
                    {item.type}
                  </span>
                  {isConnected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 size={14} /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg">
                      <AlertCircle size={14} /> Ready for Configuration
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-600">{item.desc}</p>
              </div>

              <div className="pt-4 border-t flex items-center justify-between text-xs">
                <span className="font-mono text-gray-400">Environment Variables Managed</span>
                <span className={`font-bold ${isConnected ? 'text-green-700' : 'text-indigo-950'}`}>
                  {isConnected ? 'Active' : 'Pending API Key'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
