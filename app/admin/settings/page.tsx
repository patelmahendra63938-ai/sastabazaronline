import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  CreditCard,
  PackageCheck,
  Plug,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Tags,
  Truck,
} from 'lucide-react';
import { getShippingRulesSetting } from '@/lib/settings/store-settings';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const shipping = await getShippingRulesSetting();
  const integrationsConfigured = [
    Boolean(process.env.COURIER_API_KEY || process.env.NIMBUSPOST_API_KEY || process.env.NIMBUSPOST_API_TOKEN),
    Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
    Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && (process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN)),
  ].filter(Boolean).length;

  const sections = [
    {
      title: 'Store Profile',
      description: 'Store identity, support contacts, and regional defaults.',
      status: 'Planned for Phase B',
      icon: Store,
    },
    {
      title: 'Checkout',
      description: 'Payment method availability, minimum order, and customer-field rules.',
      status: 'Planned for Phase B',
      icon: CreditCard,
    },
    {
      title: 'Shipping',
      description: `${shipping.value.free_shipping_enabled ? 'Free shipping enabled' : 'Free shipping disabled'} · ${shipping.value.courier_markup_pct}% saved markup · version ${shipping.version || 1}`,
      status: 'Editable now',
      href: '/admin/shipping',
      icon: Truck,
    },
    {
      title: 'Orders',
      description: 'Order prefix and default initial status.',
      status: 'Planned for Phase B',
      icon: PackageCheck,
    },
    {
      title: 'Customer Experience',
      description: 'Homepage trust, marketplace links, and moderated review visibility.',
      status: 'Planned for Phase B',
      icon: ShoppingBag,
    },
    {
      title: 'Notifications',
      description: 'Non-secret email and WhatsApp notification enablement.',
      status: 'Planned for Phase B',
      icon: Bell,
    },
    {
      title: 'Integrations',
      description: `${integrationsConfigured} of 3 provider configurations detected. Status does not guarantee connectivity.`,
      status: 'Status only',
      href: '/admin/integrations',
      icon: Plug,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">Administration</p>
        <h1 className="mt-1 text-2xl font-black text-indigo-950">Store Settings</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
          Central access to operational settings. Phase A enables shipping-rule editing; other domains remain read-only until their runtime wiring is completed safely.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-relaxed text-indigo-950">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-indigo-700" />
        <p>Provider credentials remain environment-only. This settings area stores non-secret business rules and relies on existing staff/admin authorization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ title, description, status, href, icon: Icon }) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={20} /></span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${href ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{status}</span>
              </div>
              <div className="mt-5">
                <h2 className="text-base font-black text-indigo-950">{title}</h2>
                <p className="mt-1 min-h-10 text-xs leading-relaxed text-gray-500">{description}</p>
              </div>
              {href && <span className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-orange-600">Open settings <ChevronRight size={14} /></span>}
            </>
          );

          return href ? (
            <Link key={title} href={href} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">{content}</Link>
          ) : (
            <section key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">{content}</section>
          );
        })}
      </div>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Settings2 size={20} /></span>
          <div>
            <h2 className="text-base font-black text-indigo-950">Storefront tools</h2>
            <p className="text-xs text-gray-500">Existing specialized configuration remains available.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/admin/settings/filters" className="flex items-center justify-between rounded-xl border border-gray-200 p-4 text-xs font-bold text-gray-800 transition hover:border-indigo-300 hover:bg-indigo-50/40">
            <span className="flex items-center gap-2"><SlidersHorizontal size={16} className="text-indigo-600" /> Storefront Filters</span><ChevronRight size={14} />
          </Link>
          <Link href="/admin/settings/homepage-display" className="flex items-center justify-between rounded-xl border border-gray-200 p-4 text-xs font-bold text-gray-800 transition hover:border-indigo-300 hover:bg-indigo-50/40">
            <span className="flex items-center gap-2"><ShoppingBag size={16} className="text-indigo-600" /> Homepage Display</span><ChevronRight size={14} />
          </Link>
          <Link href="/admin/settings/discounts" className="flex items-center justify-between rounded-xl border border-gray-200 p-4 text-xs font-bold text-gray-800 transition hover:border-orange-300 hover:bg-orange-50/40">
            <span className="flex items-center gap-2"><Tags size={16} className="text-orange-600" /> Discounts & Promotions</span><ChevronRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
